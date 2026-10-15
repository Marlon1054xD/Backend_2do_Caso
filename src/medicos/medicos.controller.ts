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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Rol } from '../usuarios/enums/rol.enum';
import { ActualizarMedicoDto } from './dto/actualizar-medico.dto';
import { CrearMedicoDto } from './dto/crear-medico.dto';
import { RespuestaMedicoDto } from './dto/respuesta-medico.dto';
import { MedicosService } from './medicos.service';

@ApiTags('Médicos')
@Controller('medicos')
export class MedicosController {
  constructor(private readonly medicosService: MedicosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear perfil médico (solo ADMIN)' })
  @ApiCreatedResponse({ type: RespuestaMedicoDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse({ description: 'El usuario no existe' })
  @ApiConflictResponse({ description: 'El usuario ya tiene perfil médico' })
  create(@Body() input: CrearMedicoDto): Promise<RespuestaMedicoDto> {
    return this.medicosService.create(input);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar médicos disponibles con cuenta activa',
    description:
      'La disponibilidad es general; no representa disponibilidad para una fecha u hora.',
  })
  @ApiOkResponse({ type: RespuestaMedicoDto, isArray: true })
  @ApiUnauthorizedResponse()
  findAvailable(): Promise<RespuestaMedicoDto[]> {
    return this.medicosService.findAvailable();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar especialidad/disponibilidad (solo ADMIN)',
  })
  @ApiOkResponse({ type: RespuestaMedicoDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse({ description: 'El perfil médico no existe' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: ActualizarMedicoDto,
  ): Promise<RespuestaMedicoDto> {
    return this.medicosService.update(id, input);
  }
}
