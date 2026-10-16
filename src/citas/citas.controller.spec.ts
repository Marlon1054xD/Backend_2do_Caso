import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Rol } from '../usuarios/enums/rol.enum';
import { CitasController } from './citas.controller';
import { CrearCitaDto } from './dto/crear-cita.dto';

describe('CitasController access policy', () => {
  it('protects every route with JWT authentication and the role guard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      CitasController,
    ) as Function[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('assigns each route only the intended roles', () => {
    const roles = (method: keyof CitasController): Rol[] =>
      Reflect.getMetadata(ROLES_KEY, CitasController.prototype[method]);

    expect(roles('create')).toEqual([Rol.PACIENTE]);
    expect(roles('findAll')).toEqual([Rol.ADMIN, Rol.MEDICO, Rol.PACIENTE]);
    expect(roles('updateEstado')).toEqual([Rol.MEDICO]);
    expect(roles('cancel')).toEqual([Rol.PACIENTE, Rol.ADMIN]);
  });

  it('rejects client-supplied patient and status fields', async () => {
    const validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      validationPipe.transform(
        {
          medicoId: 5,
          fecha: '2027-03-10',
          hora: '14:30',
          pacienteId: 99,
          estado: 'cancelada',
        },
        { type: 'body', metatype: CrearCitaDto },
      ),
    ).rejects.toThrow(BadRequestException);

    const dto = await validationPipe.transform(
      { medicoId: 5, fecha: '2027-03-10', hora: '14:30' },
      { type: 'body', metatype: CrearCitaDto },
    );
    expect(dto).toBeInstanceOf(CrearCitaDto);
  });
});
