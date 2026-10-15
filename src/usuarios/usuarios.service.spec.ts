import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Medico } from '../medicos/entities/medico.entity';
import { Paciente } from '../pacientes/entities/paciente.entity';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './enums/rol.enum';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  const usuario = {
    id: 7,
    nombre: 'Ana Pérez',
    email: 'ana@example.com',
    password: 'hashed-password',
    rol: Rol.PACIENTE,
    activo: true,
  } as Usuario;
  const usuarioRepository = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((input) => input),
    save: jest.fn(),
  } as unknown as Repository<Usuario>;
  const pacienteRepository = {
    create: jest.fn((input) => input),
    save: jest.fn(),
    findOne: jest.fn(),
  } as unknown as Repository<Paciente>;
  const medicoRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Medico>;
  const manager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === Usuario
        ? usuarioRepository
        : entity === Paciente
          ? pacienteRepository
          : medicoRepository,
    ),
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn(
      async (
        callback: (transactionManager: EntityManager) => Promise<unknown>,
      ) => callback(manager),
    ),
  } as unknown as DataSource;
  const service = new UsuariosService(dataSource, usuarioRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea Usuario PACIENTE y perfil en la misma transacción', async () => {
    jest.mocked(usuarioRepository.findOneBy).mockResolvedValue(null);
    jest.mocked(usuarioRepository.save).mockResolvedValue(usuario);
    jest.mocked(pacienteRepository.save).mockResolvedValue({
      id: 3,
      telefono: null,
      usuario,
    });

    const result = await service.registerPaciente({
      nombre: usuario.nombre,
      email: usuario.email,
      password: 'Password123',
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(usuarioRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ rol: Rol.PACIENTE, activo: true }),
    );
    expect(pacienteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ telefono: null, usuario }),
    );
    expect(result).not.toHaveProperty('password');
  });

  it('propaga el fallo de perfil para que la transacción revierta el registro', async () => {
    jest.mocked(usuarioRepository.findOneBy).mockResolvedValue(null);
    jest.mocked(usuarioRepository.save).mockResolvedValue(usuario);
    jest
      .mocked(pacienteRepository.save)
      .mockRejectedValue(new Error('fallo al guardar perfil'));

    await expect(
      service.registerPaciente({
        nombre: usuario.nombre,
        email: usuario.email,
        password: 'Password123',
      }),
    ).rejects.toThrow('fallo al guardar perfil');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('rechaza un cambio de rol incompatible con un perfil existente', async () => {
    jest.mocked(usuarioRepository.findOne).mockResolvedValue({
      ...usuario,
      rol: Rol.MEDICO,
    });
    jest.mocked(medicoRepository.findOne).mockResolvedValue({
      id: 5,
    } as Medico);
    jest.mocked(pacienteRepository.findOne).mockResolvedValue(null);

    await expect(service.updateRole(7, { rol: Rol.PACIENTE })).rejects.toThrow(
      BadRequestException,
    );
    expect(usuarioRepository.save).not.toHaveBeenCalled();
  });
});
