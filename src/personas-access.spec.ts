import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from '@jest/globals';
import { ROLES_KEY } from './auth/decorators/roles.decorator';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { MedicosController } from './medicos/medicos.controller';
import { PacientesController } from './pacientes/pacientes.controller';
import { Rol } from './usuarios/enums/rol.enum';

describe('Permisos de endpoints de personas', () => {
  function permissions(handler: object): unknown {
    return Reflect.getMetadata(ROLES_KEY, handler);
  }

  function guards(handler: object): unknown[] {
    return Reflect.getMetadata(GUARDS_METADATA, handler);
  }

  it('limita las operaciones administrativas al rol ADMIN', () => {
    expect(permissions(MedicosController.prototype.create)).toEqual([
      Rol.ADMIN,
    ]);
    expect(permissions(MedicosController.prototype.update)).toEqual([
      Rol.ADMIN,
    ]);
    expect(permissions(PacientesController.prototype.create)).toEqual([
      Rol.ADMIN,
    ]);
    expect(permissions(PacientesController.prototype.findAll)).toEqual([
      Rol.ADMIN,
    ]);
  });

  it('limita me de pacientes a PACIENTE y deja listado médico solo autenticado', () => {
    expect(permissions(PacientesController.prototype.findMine)).toEqual([
      Rol.PACIENTE,
    ]);
    expect(permissions(PacientesController.prototype.updateMine)).toEqual([
      Rol.PACIENTE,
    ]);
    expect(
      permissions(MedicosController.prototype.findAvailable),
    ).toBeUndefined();
    expect(guards(MedicosController.prototype.findAvailable)).toContain(
      JwtAuthGuard,
    );
  });

  it('usa el guard de rol además de JWT en las operaciones restringidas', () => {
    expect(guards(PacientesController.prototype.findMine)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });
});
