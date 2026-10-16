import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { UsuarioAutenticado } from '../auth/interfaces/usuario-autenticado.interface';
import { Medico } from '../medicos/entities/medico.entity';
import { Paciente } from '../pacientes/entities/paciente.entity';
import { Rol } from '../usuarios/enums/rol.enum';
import { ActualizarEstadoCitaDto } from './dto/actualizar-estado-cita.dto';
import { CrearCitaDto } from './dto/crear-cita.dto';
import { RespuestaCitaDto } from './dto/respuesta-cita.dto';
import { Cita, EstadoCita } from './entities/cita.entity';

const ZONA_HORARIA_NEGOCIO = 'America/Bogota';

@Injectable()
export class CitasService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Cita)
    private readonly citasRepository: Repository<Cita>,
    @InjectRepository(Medico)
    private readonly medicosRepository: Repository<Medico>,
    @InjectRepository(Paciente)
    private readonly pacientesRepository: Repository<Paciente>,
  ) {}

  async create(
    input: CrearCitaDto,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaCitaDto> {
    this.validateFutureDateTime(input.fecha, input.hora);

    return this.dataSource.transaction(async (manager) => {
      const medico = await manager.getRepository(Medico).findOne({
        where: { id: input.medicoId },
        relations: { usuario: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!medico) {
        throw new NotFoundException('El perfil médico solicitado no existe.');
      }
      if (!medico.usuario.activo) {
        throw new BadRequestException(
          'No se puede reservar con un médico inactivo.',
        );
      }
      if (!medico.disponible) {
        throw new BadRequestException(
          'El médico no está disponible para recibir citas.',
        );
      }

      const paciente = await manager.getRepository(Paciente).findOne({
        where: { usuario: { id: usuario.id } },
        relations: { usuario: true },
      });
      if (!paciente) {
        throw new NotFoundException(
          'No existe un perfil de paciente para esta cuenta.',
        );
      }
      if (!paciente.usuario.activo) {
        throw new BadRequestException(
          'No se puede reservar con un paciente inactivo.',
        );
      }

      this.validateFutureDateTime(input.fecha, input.hora);

      const existente = await manager.getRepository(Cita).findOne({
        where: {
          medico: { id: medico.id },
          fecha: input.fecha,
          hora: input.hora,
          estado: Not(EstadoCita.CANCELADA),
        },
      });
      if (existente) {
        throw new ConflictException(
          'El médico ya tiene una cita ocupando ese horario.',
        );
      }

      const citasRepository = manager.getRepository(Cita);
      const cita = await citasRepository.save(
        citasRepository.create({
          fecha: input.fecha,
          hora: input.hora,
          estado: EstadoCita.PROGRAMADA,
          paciente,
          medico,
        }),
      );
      return this.toResponse(cita, paciente, medico);
    });
  }

  async findAll(usuario: UsuarioAutenticado): Promise<RespuestaCitaDto[]> {
    const query = this.citasRepository
      .createQueryBuilder('cita')
      .innerJoin('cita.paciente', 'paciente')
      .innerJoin('paciente.usuario', 'pacienteUsuario')
      .innerJoin('cita.medico', 'medico')
      .innerJoin('medico.usuario', 'medicoUsuario')
      .select([
        'cita.id',
        'cita.fecha',
        'cita.hora',
        'cita.estado',
        'paciente.id',
        'pacienteUsuario.id',
        'pacienteUsuario.nombre',
        'medico.id',
        'medico.especialidad',
        'medicoUsuario.id',
        'medicoUsuario.nombre',
      ])
      .orderBy('cita.fecha', 'ASC')
      .addOrderBy('cita.hora', 'ASC');

    if (usuario.rol === Rol.MEDICO) {
      const medico = await this.medicosRepository.findOne({
        where: { usuario: { id: usuario.id } },
      });
      if (!medico) {
        throw new NotFoundException(
          'No existe un perfil médico para esta cuenta.',
        );
      }
      query.where('medico.id = :medicoId', { medicoId: medico.id });
    } else if (usuario.rol === Rol.PACIENTE) {
      const paciente = await this.pacientesRepository.findOne({
        where: { usuario: { id: usuario.id } },
      });
      if (!paciente) {
        throw new NotFoundException(
          'No existe un perfil de paciente para esta cuenta.',
        );
      }
      query.where('paciente.id = :pacienteId', { pacienteId: paciente.id });
    } else if (usuario.rol !== Rol.ADMIN) {
      throw new ForbiddenException('No tienes permisos para consultar citas.');
    }

    return (await query.getMany()).map((cita) =>
      this.toResponse(cita, cita.paciente, cita.medico),
    );
  }

  async complete(
    id: number,
    input: ActualizarEstadoCitaDto,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaCitaDto> {
    if (usuario.rol !== Rol.MEDICO) {
      throw new ForbiddenException('Solo un médico puede completar una cita.');
    }
    if (input.estado !== EstadoCita.COMPLETADA) {
      throw new BadRequestException(
        'La única transición permitida es programada a completada.',
      );
    }

    const citaInicial = await this.findCitaWithRelations(id);
    if (citaInicial.medico.usuario.id !== usuario.id) {
      throw new ForbiddenException(
        'Solo puedes completar citas de tu propio perfil médico.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      await this.lockMedico(manager, citaInicial.medico.id);
      const cita = await this.findCitaWithRelations(
        id,
        manager.getRepository(Cita),
      );
      if (cita.medico.usuario.id !== usuario.id) {
        throw new ForbiddenException(
          'Solo puedes completar citas de tu propio perfil médico.',
        );
      }
      if (cita.estado !== EstadoCita.PROGRAMADA) {
        throw new BadRequestException(
          'Solo se pueden completar citas programadas.',
        );
      }

      cita.estado = EstadoCita.COMPLETADA;
      const guardada = await manager.getRepository(Cita).save(cita);
      return this.toResponse(guardada, cita.paciente, cita.medico);
    });
  }

  async cancel(
    id: number,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaCitaDto> {
    if (usuario.rol !== Rol.PACIENTE && usuario.rol !== Rol.ADMIN) {
      throw new ForbiddenException(
        'Solo un paciente o administrador puede cancelar una cita.',
      );
    }

    const citaInicial = await this.findCitaWithRelations(id);
    if (
      usuario.rol === Rol.PACIENTE &&
      citaInicial.paciente.usuario.id !== usuario.id
    ) {
      throw new ForbiddenException(
        'Solo puedes cancelar citas de tu propio perfil.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      await this.lockMedico(manager, citaInicial.medico.id);
      const cita = await this.findCitaWithRelations(
        id,
        manager.getRepository(Cita),
      );
      if (
        usuario.rol === Rol.PACIENTE &&
        cita.paciente.usuario.id !== usuario.id
      ) {
        throw new ForbiddenException(
          'Solo puedes cancelar citas de tu propio perfil.',
        );
      }
      if (cita.estado === EstadoCita.COMPLETADA) {
        throw new BadRequestException(
          'No se puede cancelar una cita completada.',
        );
      }
      if (cita.estado !== EstadoCita.PROGRAMADA) {
        throw new BadRequestException(
          'Solo se pueden cancelar citas programadas.',
        );
      }

      cita.estado = EstadoCita.CANCELADA;
      const guardada = await manager.getRepository(Cita).save(cita);
      return this.toResponse(guardada, cita.paciente, cita.medico);
    });
  }

  private async lockMedico(
    manager: EntityManager,
    medicoId: number,
  ): Promise<Medico> {
    const medico = await manager.getRepository(Medico).findOne({
      where: { id: medicoId },
      relations: { usuario: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!medico) {
      throw new NotFoundException('El perfil médico de la cita no existe.');
    }
    return medico;
  }

  private async findCitaWithRelations(
    id: number,
    repository: Repository<Cita> = this.citasRepository,
  ): Promise<Cita> {
    const cita = await repository.findOne({
      where: { id },
      relations: {
        paciente: { usuario: true },
        medico: { usuario: true },
      },
    });
    if (!cita) {
      throw new NotFoundException('La cita solicitada no existe.');
    }
    return cita;
  }

  private validateFutureDateTime(fecha: string, hora: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException('La fecha debe tener formato YYYY-MM-DD.');
    }
    const parsedDate = new Date(`${fecha}T00:00:00.000Z`);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== fecha
    ) {
      throw new BadRequestException('La fecha indicada no es una fecha real.');
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      throw new BadRequestException('La hora debe tener formato HH:mm válido.');
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_HORARIA_NEGOCIO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const now = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map(({ type, value }) => [type, value]),
    );
    const fechaHoraActual = `${now.year}-${now.month}-${now.day}T${now.hour}:${now.minute}:${now.second}`;

    if (`${fecha}T${hora}:00` <= fechaHoraActual) {
      throw new BadRequestException(
        `La cita debe ser futura según la zona horaria ${ZONA_HORARIA_NEGOCIO}.`,
      );
    }
  }

  private toResponse(
    cita: Cita,
    paciente: Paciente,
    medico: Medico,
  ): RespuestaCitaDto {
    return {
      id: cita.id,
      fecha: cita.fecha,
      hora: cita.hora,
      estado: cita.estado,
      paciente: {
        id: paciente.id,
        nombre: paciente.usuario.nombre,
      },
      medico: {
        id: medico.id,
        nombre: medico.usuario.nombre,
        especialidad: medico.especialidad,
      },
    };
  }
}
