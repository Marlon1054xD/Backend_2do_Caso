import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/enums/rol.enum';
import { ActualizarMiPacienteDto } from './dto/actualizar-mi-paciente.dto';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { RespuestaPacienteDto } from './dto/respuesta-paciente.dto';
import { Paciente } from './entities/paciente.entity';

@Injectable()
export class PacientesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Paciente)
    private readonly pacientesRepository: Repository<Paciente>,
  ) {}

  async create(input: CrearPacienteDto): Promise<RespuestaPacienteDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const usuariosRepository = manager.getRepository(Usuario);
        const pacientesRepository = manager.getRepository(Paciente);
        const usuario = await usuariosRepository.findOne({
          where: { id: input.usuarioId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!usuario) {
          throw new NotFoundException('El usuario solicitado no existe.');
        }
        if (usuario.rol !== Rol.PACIENTE) {
          throw new BadRequestException(
            'Solo se puede asociar un usuario con rol PACIENTE.',
          );
        }
        if (
          await pacientesRepository.findOne({
            where: { usuario: { id: usuario.id } },
          })
        ) {
          throw new ConflictException(
            'El usuario ya tiene un perfil de paciente.',
          );
        }

        const paciente = await pacientesRepository.save(
          pacientesRepository.create({
            telefono: input.telefono ?? null,
            usuario,
          }),
        );
        return this.toResponse(paciente);
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'El usuario ya tiene un perfil de paciente.',
        );
      }
      throw error;
    }
  }

  async findAll(): Promise<RespuestaPacienteDto[]> {
    const pacientes = await this.pacientesRepository.find({
      relations: { usuario: true },
      order: { id: 'ASC' },
    });
    return pacientes.map((paciente) => this.toResponse(paciente));
  }

  async findMine(usuarioId: number): Promise<RespuestaPacienteDto> {
    const paciente = await this.pacientesRepository.findOne({
      where: { usuario: { id: usuarioId } },
      relations: { usuario: true },
    });
    if (!paciente) {
      throw new NotFoundException(
        'No existe un perfil de paciente para esta cuenta.',
      );
    }
    return this.toResponse(paciente);
  }

  async updateMine(
    usuarioId: number,
    input: ActualizarMiPacienteDto,
  ): Promise<RespuestaPacienteDto> {
    const paciente = await this.pacientesRepository.findOne({
      where: { usuario: { id: usuarioId } },
      relations: { usuario: true },
    });
    if (!paciente) {
      throw new NotFoundException(
        'No existe un perfil de paciente para esta cuenta.',
      );
    }

    if (input.telefono !== undefined) {
      paciente.telefono = input.telefono;
    }
    return this.toResponse(await this.pacientesRepository.save(paciente));
  }

  private toResponse(paciente: Paciente): RespuestaPacienteDto {
    return {
      id: paciente.id,
      telefono: paciente.telefono,
      usuario: {
        id: paciente.usuario.id,
        nombre: paciente.usuario.nombre,
        email: paciente.usuario.email,
        rol: paciente.usuario.rol,
        activo: paciente.usuario.activo,
      },
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code === 'ER_DUP_ENTRY'
    );
  }
}
