import { Body, Controller, Get, Post, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { UsuarioAutenticado } from '../auth/interfaces/usuario-autenticado.interface';
import { Rol } from '../usuarios/enums/rol.enum';
import { ActualizarMiPacienteDto } from './dto/actualizar-mi-paciente.dto';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { RespuestaPacienteDto } from './dto/respuesta-paciente.dto';
import { PacientesService } from './pacientes.service';

@ApiTags('Pacientes')
@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear perfil de paciente (solo ADMIN)' })
  @ApiCreatedResponse({ type: RespuestaPacienteDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse({ description: 'El usuario no existe' })
  @ApiConflictResponse({
    description: 'El usuario ya tiene perfil de paciente',
  })
  create(@Body() input: CrearPacienteDto): Promise<RespuestaPacienteDto> {
    return this.pacientesService.create(input);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar pacientes (solo ADMIN)' })
  @ApiOkResponse({ type: RespuestaPacienteDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  findAll(): Promise<RespuestaPacienteDto[]> {
    return this.pacientesService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PACIENTE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar el perfil propio de paciente' })
  @ApiOkResponse({ type: RespuestaPacienteDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse({
    description: 'La cuenta aún no tiene perfil de paciente',
  })
  findMine(
    @CurrentUser() currentUser: UsuarioAutenticado,
  ): Promise<RespuestaPacienteDto> {
    return this.pacientesService.findMine(currentUser.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PACIENTE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar el teléfono del perfil propio' })
  @ApiOkResponse({ type: RespuestaPacienteDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse({
    description: 'La cuenta aún no tiene perfil de paciente',
  })
  updateMine(
    @CurrentUser() currentUser: UsuarioAutenticado,
    @Body() input: ActualizarMiPacienteDto,
  ): Promise<RespuestaPacienteDto> {
    return this.pacientesService.updateMine(currentUser.id, input);
  }
}
