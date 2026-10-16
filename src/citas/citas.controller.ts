import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
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
import { ActualizarEstadoCitaDto } from './dto/actualizar-estado-cita.dto';
import { CrearCitaDto } from './dto/crear-cita.dto';
import { RespuestaCitaDto } from './dto/respuesta-cita.dto';
import { CitasService } from './citas.service';

@ApiTags('Citas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('citas')
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @Post()
  @Roles(Rol.PACIENTE)
  @ApiOperation({
    summary: 'Reservar una cita (solo PACIENTE)',
    description:
      'La fecha y hora son locales de America/Bogota. El paciente se toma de la cuenta autenticada.',
  })
  @ApiCreatedResponse({ type: RespuestaCitaDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse({ description: 'Datos inválidos o fecha/hora pasada' })
  @ApiNotFoundResponse({
    description: 'Médico o perfil de paciente inexistente',
  })
  @ApiConflictResponse({ description: 'El médico ya tiene ocupado el horario' })
  create(
    @Body() input: CrearCitaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<RespuestaCitaDto> {
    return this.citasService.create(input, usuario);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.MEDICO, Rol.PACIENTE)
  @ApiOperation({
    summary: 'Listar citas según el rol autenticado',
    description:
      'ADMIN ve todas; MEDICO y PACIENTE solo ven las citas de su propio perfil.',
  })
  @ApiOkResponse({ type: RespuestaCitaDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse({ description: 'No existe perfil para la cuenta' })
  findAll(
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<RespuestaCitaDto[]> {
    return this.citasService.findAll(usuario);
  }

  @Patch(':id/estado')
  @Roles(Rol.MEDICO)
  @ApiOperation({
    summary: 'Completar una cita propia (solo MEDICO)',
    description: 'La única transición permitida es programada -> completada.',
  })
  @ApiOkResponse({ type: RespuestaCitaDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse({ description: 'Transición de estado no permitida' })
  @ApiNotFoundResponse()
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: ActualizarEstadoCitaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<RespuestaCitaDto> {
    return this.citasService.complete(id, input, usuario);
  }

  @Patch(':id/cancelar')
  @Roles(Rol.PACIENTE, Rol.ADMIN)
  @ApiOperation({
    summary: 'Cancelar una cita propia o cualquier cita como ADMIN',
  })
  @ApiOkResponse({ type: RespuestaCitaDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse({
    description: 'La cita no está en estado programada',
  })
  @ApiNotFoundResponse()
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<RespuestaCitaDto> {
    return this.citasService.cancel(id, usuario);
  }
}
