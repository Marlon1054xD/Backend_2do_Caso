import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/enums/rol.enum';
import { Medico } from './entities/medico.entity';
import { MedicosService } from './medicos.service';

describe('MedicosService', () => {
  const usuario = {
    id: 12,
    nombre: 'Luis Gómez',
    email: 'luis@example.com',
    password: 'secret-hash',
    rol: Rol.MEDICO,
    activo: true,
  } as Usuario;
  const usuariosRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Usuario>;
  const medicosRepository = {
    create: jest.fn((input) => input),
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  } as unknown as Repository<Medico>;
  const manager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === Usuario ? usuariosRepository : medicosRepository,
    ),
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn(
      async (
        callback: (transactionManager: EntityManager) => Promise<unknown>,
      ) => callback(manager),
    ),
  } as unknown as DataSource;
  const service = new MedicosService(dataSource, medicosRepository);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza asociar un usuario que no tenga rol MEDICO', async () => {
    jest.mocked(usuariosRepository.findOne).mockResolvedValue({
      ...usuario,
      rol: Rol.PACIENTE,
    });

    await expect(
      service.create({ usuarioId: 12, especialidad: 'Cardiología' }),
    ).rejects.toThrow(BadRequestException);
    expect(medicosRepository.save).not.toHaveBeenCalled();
  });

  it('previene perfiles duplicados', async () => {
    jest.mocked(usuariosRepository.findOne).mockResolvedValue(usuario);
    jest
      .mocked(medicosRepository.findOne)
      .mockResolvedValue({ id: 2 } as Medico);

    await expect(
      service.create({ usuarioId: 12, especialidad: 'Cardiología' }),
    ).rejects.toThrow(ConflictException);
    expect(medicosRepository.save).not.toHaveBeenCalled();
  });

  it('lista solo médicos disponibles con cuentas activas y omite contraseñas', async () => {
    jest.mocked(medicosRepository.find).mockResolvedValue([
      {
        id: 8,
        especialidad: 'Cardiología',
        disponible: true,
        usuario,
      } as Medico,
    ]);

    const result = await service.findAvailable();

    expect(medicosRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { disponible: true, usuario: { activo: true } },
      }),
    );
    expect(result[0].usuario).not.toHaveProperty('password');
  });
});
