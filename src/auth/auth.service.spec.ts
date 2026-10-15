import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { Rol } from '../usuarios/enums/rol.enum';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usuario = {
    id: 4,
    nombre: 'Ana Pérez',
    email: 'ana@example.com',
    password: 'hashed',
    rol: Rol.PACIENTE,
    activo: true,
  };
  const usuariosService = {
    create: jest.fn(),
    findByEmailWithPassword: jest.fn(),
  } as unknown as jest.Mocked<UsuariosService>;
  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;
  const authService = new AuthService(usuariosService, jwtService);

  beforeEach(() => jest.clearAllMocks());

  it('registra exclusivamente con el rol PACIENTE por defecto', async () => {
    const result = {
      id: 4,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: Rol.PACIENTE,
      activo: true,
    };
    jest.mocked(usuariosService.create).mockResolvedValue(result);

    await authService.register({
      nombre: usuario.nombre,
      email: usuario.email,
      password: 'Password123',
    });

    expect(usuariosService.create).toHaveBeenCalledWith({
      nombre: usuario.nombre,
      email: usuario.email,
      password: 'Password123',
    });
  });

  it('verifica la contraseña y responde con token sin exponer hash', async () => {
    const passwordHash = await bcrypt.hash('Password123', 4);
    jest.mocked(usuariosService.findByEmailWithPassword).mockResolvedValue(
      { ...usuario, password: passwordHash },
    );
    jest.mocked(jwtService.signAsync).mockResolvedValue('jwt-token');

    const result = await authService.login({
      email: usuario.email,
      password: 'Password123',
    });

    expect(result.access_token).toBe('jwt-token');
    expect(result.usuario).not.toHaveProperty('password');
  });

  it('rechaza credenciales inválidas', async () => {
    jest.mocked(usuariosService.findByEmailWithPassword).mockResolvedValue(null);

    await expect(
      authService.login({ email: usuario.email, password: 'incorrecta' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});