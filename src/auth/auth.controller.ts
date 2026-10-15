import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RegistroPacienteDto } from '../usuarios/dto/registro-paciente.dto';
import { RespuestaUsuarioDto } from '../usuarios/dto/respuesta-usuario.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar una cuenta PACIENTE' })
  @ApiCreatedResponse({ type: RespuestaUsuarioDto })
  @ApiConflictResponse({ description: 'El correo ya está registrado' })
  register(@Body() input: RegistroPacienteDto): Promise<RespuestaUsuarioDto> {
    return this.authService.register(input);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión y obtener un JWT' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  login(@Body() input: LoginDto) {
    return this.authService.login(input);
  }
}