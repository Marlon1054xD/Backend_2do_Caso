import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Medico } from '../medicos/entities/medico.entity';
import { Paciente } from '../pacientes/entities/paciente.entity';
import { ActualizarRolDto } from './dto/actualizar-rol.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { RegistroPacienteDto } from './dto/registro-paciente.dto';
import { RespuestaUsuarioDto } from './dto/respuesta-usuario.dto';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './enums/rol.enum';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async findAll(): Promise<RespuestaUsuarioDto[]> {
    const usuarios = await this.usuariosRepository.find();
    return usuarios.map((usuario) => this.toResponse(usuario));
  }

  async findById(id: number): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<Usuario | null> {
    return this.usuariosRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.password')
      .where('usuario.email = :email', { email })
      .getOne();
  }

  async create(
    input: Pick<CrearUsuarioDto, 'nombre' | 'email' | 'password'>,
    rol: Rol = Rol.PACIENTE,
  ): Promise<RespuestaUsuarioDto> {
    if (await this.findByEmail(input.email)) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    const password = await bcrypt.hash(input.password, 12);
    const usuario = this.usuariosRepository.create({
      ...input,
      password,
      rol,
      activo: true,
    });

    try {
      return this.toResponse(await this.usuariosRepository.save(usuario));
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException(
          'El correo electrónico ya está registrado.',
        );
      }
      throw error;
    }
  }

  async registerPaciente(
    input: RegistroPacienteDto,
  ): Promise<RespuestaUsuarioDto> {
    const password = await bcrypt.hash(input.password, 12);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const usuariosRepository = manager.getRepository(Usuario);
        const pacientesRepository = manager.getRepository(Paciente);
        if (await usuariosRepository.findOneBy({ email: input.email })) {
          throw new ConflictException(
            'El correo electrónico ya está registrado.',
          );
        }

        const usuario = await usuariosRepository.save(
          usuariosRepository.create({
            nombre: input.nombre,
            email: input.email,
            password,
            rol: Rol.PACIENTE,
            activo: true,
          }),
        );
        await pacientesRepository.save(
          pacientesRepository.create({ telefono: null, usuario }),
        );
        return this.toResponse(usuario);
      });
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException(
          'El correo electrónico ya está registrado.',
        );
      }
      throw error;
    }
  }

  async createAdminIfMissing(input: {
    nombre: string;
    email: string;
    password: string;
  }): Promise<boolean> {
    if (await this.findByEmail(input.email)) {
      return false;
    }

    try {
      await this.create(input, Rol.ADMIN);
      return true;
    } catch (error) {
      if (error instanceof ConflictException) {
        return false;
      }
      throw error;
    }
  }

  async updateRole(
    id: number,
    input: ActualizarRolDto,
  ): Promise<RespuestaUsuarioDto> {
    return this.dataSource.transaction(async (manager) => {
      const usuariosRepository = manager.getRepository(Usuario);
      const usuario = await usuariosRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!usuario) {
        throw new NotFoundException('El usuario solicitado no existe.');
      }

      const medico = await manager
        .getRepository(Medico)
        .findOne({ where: { usuario: { id } } });
      const paciente = await manager
        .getRepository(Paciente)
        .findOne({ where: { usuario: { id } } });
      if (medico && input.rol !== Rol.MEDICO) {
        throw new BadRequestException(
          'No se puede cambiar el rol: este usuario tiene un perfil médico.',
        );
      }
      if (paciente && input.rol !== Rol.PACIENTE) {
        throw new BadRequestException(
          'No se puede cambiar el rol: este usuario tiene un perfil de paciente.',
        );
      }

      usuario.rol = input.rol;
      return this.toResponse(await usuariosRepository.save(usuario));
    });
  }

  private toResponse(usuario: Usuario): RespuestaUsuarioDto {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
    };
  }

  private isDuplicateEmailError(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code === 'ER_DUP_ENTRY'
    );
  }
}
