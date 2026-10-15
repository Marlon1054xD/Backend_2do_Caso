import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Rol } from '../../usuarios/enums/rol.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  function contextWithRole(rol?: Rol): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => (rol ? { user: { id: 1, rol } } : { user: undefined }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => jest.clearAllMocks());

  it('permite el rol requerido', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue([Rol.ADMIN]);
    expect(guard.canActivate(contextWithRole(Rol.ADMIN))).toBe(true);
  });

  it('rechaza con 403 un rol distinto', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue([Rol.ADMIN]);
    expect(() => guard.canActivate(contextWithRole(Rol.PACIENTE))).toThrow(
      ForbiddenException,
    );
  });

  it('permite rutas sin roles declarados', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);
    expect(guard.canActivate(contextWithRole())).toBe(true);
  });
});