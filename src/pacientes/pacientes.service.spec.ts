import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/enums/rol.enum';
import { Paciente } from './entities/paciente.entity';
import { PacientesService } from './pacientes.service';

describe('PacientesService', () => {
  const usuario = {
    id: 34,
    nombre: 'Ana Pérez',
    email: 'ana@example.com',
    password: 'secret-hash',
    rol: Rol.PACIENTE,
    activo: true,
  } as Usuario;
  const usuariosRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Usuario>;
  const pacientesRepository = {
    create: jest.fn((input) => input),
    findOne: jest.fn(),
    save: jest.fn(),
  } as unknown as Repository<Paciente>;
  const manager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === Usuario ? usuariosRepository : pacientesRepository,
    ),
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn(
      async (
        callback: (transactionManager: EntityManager) => Promise<unknown>,
      ) => callback(manager),
    ),
  } as unknown as DataSource;
  const service = new PacientesService(dataSource, pacientesRepository);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza asociar un usuario que no tenga rol PACIENTE', async () => {
    jest.mocked(usuariosRepository.findOne).mockResolvedValue({
      ...usuario,
      rol: Rol.MEDICO,
    });

    await expect(service.create({ usuarioId: 34 })).rejects.toThrow(
      BadRequestException,
    );
    expect(pacientesRepository.save).not.toHaveBeenCalled();
  });

  it('previene perfiles de paciente duplicados', async () => {
    jest.mocked(usuariosRepository.findOne).mockResolvedValue(usuario);
    jest.mocked(pacientesRepository.findOne).mockResolvedValue({
      id: 9,
    } as Paciente);

    await expect(service.create({ usuarioId: 34 })).rejects.toThrow(
      ConflictException,
    );
    expect(pacientesRepository.save).not.toHaveBeenCalled();
  });

  it('consulta únicamente el perfil asociado al usuario autenticado', async () => {
    jest.mocked(pacientesRepository.findOne).mockResolvedValue({
      id: 9,
      telefono: '555-0100',
      usuario,
    } as Paciente);

    const result = await service.findMine(34);

    expect(pacientesRepository.findOne).toHaveBeenCalledWith({
      where: { usuario: { id: 34 } },
      relations: { usuario: true },
    });
    expect(result.usuario.id).toBe(34);
    expect(result.usuario).not.toHaveProperty('password');
  });

  it('actualiza únicamente el teléfono y conserva el usuario asociado', async () => {
    const paciente = { id: 9, telefono: null, usuario } as Paciente;
    jest.mocked(pacientesRepository.findOne).mockResolvedValue(paciente);
    jest
      .mocked(pacientesRepository.save)
      .mockImplementation(async (entity) => entity);

    await service.updateMine(34, { telefono: '555-0101' });

    expect(paciente.telefono).toBe('555-0101');
    expect(paciente.usuario).toBe(usuario);
    expect(pacientesRepository.save).toHaveBeenCalledWith(paciente);
  });
});
