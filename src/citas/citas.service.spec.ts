import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, EntityManager, FindOperator, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { UsuarioAutenticado } from '../auth/interfaces/usuario-autenticado.interface';
import { Medico } from '../medicos/entities/medico.entity';
import { Paciente } from '../pacientes/entities/paciente.entity';
import { Rol } from '../usuarios/enums/rol.enum';
import { ActualizarEstadoCitaDto } from './dto/actualizar-estado-cita.dto';
import { CrearCitaDto } from './dto/crear-cita.dto';
import { CitasService } from './citas.service';
import { Cita, EstadoCita } from './entities/cita.entity';

describe('CitasService', () => {
  const pacienteUsuario = {
    id: 21,
    nombre: 'Paciente Prueba',
    email: 'paciente@example.test',
    password: 'hash-no-debe-exponerse',
    rol: Rol.PACIENTE,
    activo: true,
  };
  const medicoUsuario = {
    id: 34,
    nombre: 'Medico Prueba',
    email: 'medico@example.test',
    password: 'hash-no-debe-exponerse',
    rol: Rol.MEDICO,
    activo: true,
  };
  const paciente = {
    id: 4,
    telefono: null,
    usuario: pacienteUsuario,
  } as Paciente;
  const medico = {
    id: 9,
    especialidad: 'Cardiología',
    disponible: true,
    usuario: medicoUsuario,
  } as Medico;
  const pacienteAuth: UsuarioAutenticado = {
    id: pacienteUsuario.id,
    rol: Rol.PACIENTE,
  };
  const medicoAuth: UsuarioAutenticado = {
    id: medicoUsuario.id,
    rol: Rol.MEDICO,
  };
  const citaProgramada = {
    id: 18,
    fecha: '2027-03-10',
    hora: '14:30:00',
    estado: EstadoCita.PROGRAMADA,
    paciente,
    medico,
  } as Cita;

  const citaRepository = {
    create: jest.fn((input) => input),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
  } as unknown as Repository<Cita>;
  const medicoRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Medico>;
  const pacienteRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Paciente>;
  const managerCitaRepository = {
    create: jest.fn((input) => input),
    findOne: jest.fn(),
    save: jest.fn(),
  } as unknown as Repository<Cita>;
  const managerMedicoRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Medico>;
  const managerPacienteRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Paciente>;
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Cita) return managerCitaRepository;
      if (entity === Medico) return managerMedicoRepository;
      return managerPacienteRepository;
    }),
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn(
      async (
        callback: (transactionManager: EntityManager) => Promise<unknown>,
      ) => callback(manager),
    ),
  } as unknown as DataSource;
  const service = new CitasService(
    dataSource,
    citaRepository,
    medicoRepository,
    pacienteRepository,
  );

  const input: CrearCitaDto = {
    medicoId: medico.id,
    fecha: '2027-03-10',
    hora: '14:30',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    citaProgramada.estado = EstadoCita.PROGRAMADA;
    jest.mocked(managerMedicoRepository.findOne).mockResolvedValue(medico);
    jest.mocked(managerPacienteRepository.findOne).mockResolvedValue(paciente);
    jest.mocked(managerCitaRepository.findOne).mockResolvedValue(null);
    jest
      .mocked(managerCitaRepository.save)
      .mockImplementation(async (cita) => ({ ...cita, id: 33 }) as Cita);
  });

  it('reserva siempre como programada y bloquea la fila del médico', async () => {
    const result = await service.create(input, pacienteAuth);

    expect(managerMedicoRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: medico.id },
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(managerCitaRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          medico: { id: medico.id },
          fecha: input.fecha,
          hora: input.hora,
        }),
      }),
    );
    expect(managerCitaRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: EstadoCita.PROGRAMADA,
        paciente,
        medico,
      }),
    );
    expect(result.estado).toBe(EstadoCita.PROGRAMADA);
    expect(result.paciente).toEqual({
      id: paciente.id,
      nombre: pacienteUsuario.nombre,
    });
    expect(JSON.stringify(result)).not.toContain('password');
  });

  it('rechaza el mismo horario cuando ya está ocupado', async () => {
    jest
      .mocked(managerCitaRepository.findOne)
      .mockResolvedValue(citaProgramada);

    await expect(service.create(input, pacienteAuth)).rejects.toThrow(
      ConflictException,
    );
    expect(managerCitaRepository.save).not.toHaveBeenCalled();
  });

  it('considera canceladas reutilizables al buscar ocupación', async () => {
    await service.create(input, pacienteAuth);

    const where = jest.mocked(managerCitaRepository.findOne).mock.calls[0][0]
      .where as { estado: FindOperator<EstadoCita> };
    expect(where.estado.type).toBe('not');
    expect(where.estado.value).toBe(EstadoCita.CANCELADA);
    expect(managerCitaRepository.save).toHaveBeenCalled();
  });

  it('rechaza fechas reales inválidas y horarios pasados', async () => {
    await expect(
      service.create({ ...input, fecha: '2027-02-30' }, pacienteAuth),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.create(
        { ...input, fecha: '2020-01-01', hora: '10:00' },
        pacienteAuth,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('cancela una cita programada dentro de la transacción', async () => {
    jest.mocked(citaRepository.findOne).mockResolvedValueOnce(citaProgramada);
    jest
      .mocked(managerCitaRepository.findOne)
      .mockResolvedValueOnce(citaProgramada);
    jest
      .mocked(managerCitaRepository.save)
      .mockImplementation(
        async (cita) => ({ ...cita, estado: EstadoCita.CANCELADA }) as Cita,
      );

    const result = await service.cancel(citaProgramada.id, {
      id: pacienteUsuario.id,
      rol: Rol.ADMIN,
    });

    expect(managerMedicoRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(result.estado).toBe(EstadoCita.CANCELADA);
  });

  it('impide que un paciente cancele una cita de otro paciente', async () => {
    jest.mocked(citaRepository.findOne).mockResolvedValueOnce(citaProgramada);

    await expect(
      service.cancel(citaProgramada.id, {
        id: pacienteUsuario.id + 1,
        rol: Rol.PACIENTE,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rechaza cancelar una cita completada', async () => {
    jest.mocked(citaRepository.findOne).mockResolvedValueOnce(citaProgramada);
    jest.mocked(managerCitaRepository.findOne).mockResolvedValueOnce({
      ...citaProgramada,
      estado: EstadoCita.COMPLETADA,
    } as Cita);

    await expect(
      service.cancel(citaProgramada.id, {
        id: pacienteUsuario.id,
        rol: Rol.ADMIN,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(managerCitaRepository.save).not.toHaveBeenCalled();
  });

  it('solo permite completar citas propias programadas', async () => {
    jest.mocked(citaRepository.findOne).mockResolvedValueOnce(citaProgramada);
    jest
      .mocked(managerCitaRepository.findOne)
      .mockResolvedValueOnce(citaProgramada);

    const result = await service.complete(
      citaProgramada.id,
      { estado: EstadoCita.COMPLETADA } as ActualizarEstadoCitaDto,
      medicoAuth,
    );
    expect(result.estado).toBe(EstadoCita.COMPLETADA);

    jest.clearAllMocks();
    jest.mocked(citaRepository.findOne).mockResolvedValueOnce(citaProgramada);
    await expect(
      service.complete(
        citaProgramada.id,
        { estado: EstadoCita.COMPLETADA },
        { id: medicoUsuario.id + 1, rol: Rol.MEDICO },
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rechaza completar citas canceladas y cualquier transición distinta', async () => {
    await expect(
      service.complete(
        citaProgramada.id,
        { estado: EstadoCita.CANCELADA },
        medicoAuth,
      ),
    ).rejects.toThrow(BadRequestException);

    jest.mocked(citaRepository.findOne).mockResolvedValueOnce(citaProgramada);
    jest.mocked(managerCitaRepository.findOne).mockResolvedValueOnce({
      ...citaProgramada,
      estado: EstadoCita.CANCELADA,
    } as Cita);
    await expect(
      service.complete(
        citaProgramada.id,
        { estado: EstadoCita.COMPLETADA },
        medicoAuth,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('filtra la lista por el perfil de paciente autenticado', async () => {
    const queryBuilder = {
      innerJoin: jest.fn(),
      select: jest.fn(),
      orderBy: jest.fn(),
      addOrderBy: jest.fn(),
      where: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    queryBuilder.innerJoin.mockReturnValue(queryBuilder);
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.orderBy.mockReturnValue(queryBuilder);
    queryBuilder.addOrderBy.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    jest
      .mocked(citaRepository.createQueryBuilder)
      .mockReturnValue(queryBuilder as never);
    jest.mocked(pacienteRepository.findOne).mockResolvedValue(paciente);

    await service.findAll(pacienteAuth);

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'paciente.id = :pacienteId',
      { pacienteId: paciente.id },
    );
  });
});
