import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, DataSource, Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/enums/rol.enum';
import { ActualizarMedicoDto } from './dto/actualizar-medico.dto';
import { CrearMedicoDto } from './dto/crear-medico.dto';
import { RespuestaMedicoDto } from './dto/respuesta-medico.dto';
import { Medico } from './entities/medico.entity';

@Injectable()
export class MedicosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Medico)
    private readonly medicosRepository: Repository<Medico>,
  ) {}

  async create(input: CrearMedicoDto): Promise<RespuestaMedicoDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const usuariosRepository = manager.getRepository(Usuario);
        const medicosRepository = manager.getRepository(Medico);
        const usuario = await usuariosRepository.findOne({
          where: { id: input.usuarioId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!usuario) {
          throw new NotFoundException('El usuario solicitado no existe.');
        }
        if (usuario.rol !== Rol.MEDICO) {
          throw new BadRequestException(
            'Solo se puede asociar un usuario con rol MEDICO.',
          );
        }
        if (
          await medicosRepository.findOne({
            where: { usuario: { id: usuario.id } },
          })
        ) {
          throw new ConflictException('El usuario ya tiene un perfil médico.');
        }

        const medico = await medicosRepository.save(
          medicosRepository.create({
            especialidad: input.especialidad,
            disponible: input.disponible ?? true,
            usuario,
          }),
        );
        return this.toResponse(medico);
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('El usuario ya tiene un perfil médico.');
      }
      throw error;
    }
  }

  async findAvailable(): Promise<RespuestaMedicoDto[]> {
    const medicos = await this.medicosRepository.find({
      where: { disponible: true, usuario: { activo: true } },
      relations: { usuario: true },
      order: { id: 'ASC' },
    });
    return medicos.map((medico) => this.toResponse(medico));
  }

  async update(
    id: number,
    input: ActualizarMedicoDto,
  ): Promise<RespuestaMedicoDto> {
    const medico = await this.medicosRepository.findOne({
      where: { id },
      relations: { usuario: true },
    });
    if (!medico) {
      throw new NotFoundException('El perfil médico solicitado no existe.');
    }

    Object.assign(medico, input);
    return this.toResponse(await this.medicosRepository.save(medico));
  }

  private toResponse(medico: Medico): RespuestaMedicoDto {
    return {
      id: medico.id,
      especialidad: medico.especialidad,
      disponible: medico.disponible,
      usuario: {
        id: medico.usuario.id,
        nombre: medico.usuario.nombre,
        email: medico.usuario.email,
        rol: medico.usuario.rol,
        activo: medico.usuario.activo,
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
