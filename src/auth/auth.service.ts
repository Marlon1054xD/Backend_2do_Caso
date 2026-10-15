import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegistroPacienteDto } from '../usuarios/dto/registro-paciente.dto';
import { RespuestaUsuarioDto } from '../usuarios/dto/respuesta-usuario.dto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  register(input: RegistroPacienteDto): Promise<RespuestaUsuarioDto> {
    return this.usuariosService.registerPaciente(input);
  }

  async login(input: LoginDto): Promise<{
    access_token: string;
    usuario: RespuestaUsuarioDto;
  }> {
    const usuario = await this.usuariosService.findByEmailWithPassword(
      input.email,
    );
    if (
      !usuario ||
      !usuario.activo ||
      !(await bcrypt.compare(input.password, usuario.password))
    ) {
      throw new UnauthorizedException(
        'Correo electrónico o contraseña incorrectos.',
      );
    }

    const accessToken = await this.jwtService.signAsync({ sub: usuario.id });
    return {
      access_token: accessToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
      },
    };
  }
}
