import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { Rol } from '../../usuarios/enums/rol.enum';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;
  const usuariosService = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<UsuariosService>;
  const strategy = new JwtStrategy(config, usuariosService);

  beforeEach(() => jest.clearAllMocks());

  it('usa el rol actual de la base de datos para request.user', async () => {
    jest.mocked(usuariosService.findById).mockResolvedValue({
      id: 7,
      rol: Rol.ADMIN,
      activo: true,
    } as never);

    await expect(strategy.validate({ sub: 7 })).resolves.toEqual({
      id: 7,
      rol: Rol.ADMIN,
    });
    expect(usuariosService.findById).toHaveBeenCalledWith(7);
  });

  it('rechaza usuarios inactivos', async () => {
    jest.mocked(usuariosService.findById).mockResolvedValue({
      id: 7,
      rol: Rol.PACIENTE,
      activo: false,
    } as never);

    await expect(strategy.validate({ sub: 7 })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});