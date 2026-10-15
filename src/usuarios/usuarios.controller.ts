import {
  Body,
  Controller,
  Get,
  NotFoundException,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { UsuarioAutenticado } from '../auth/interfaces/usuario-autenticado.interface';
import { ActualizarRolDto } from './dto/actualizar-rol.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { RespuestaUsuarioDto } from './dto/respuesta-usuario.dto';
import { Rol } from './enums/rol.enum';
import { UsuariosService } from './usuarios.service';

@ApiTags('Usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un usuario (solo ADMIN)' })
  @ApiCreatedResponse({ type: RespuestaUsuarioDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse({ description: 'El correo ya está registrado' })
  create(@Body() input: CrearUsuarioDto): Promise<RespuestaUsuarioDto> {
    return this.usuariosService.create(input, input.rol ?? Rol.PACIENTE);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuarios (solo ADMIN)' })
  @ApiOkResponse({ type: RespuestaUsuarioDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  findAll(): Promise<RespuestaUsuarioDto[]> {
    return this.usuariosService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar el perfil autenticado' })
  @ApiOkResponse({ type: RespuestaUsuarioDto })
  @ApiUnauthorizedResponse()
  async findMe(
    @CurrentUser() currentUser: UsuarioAutenticado,
  ): Promise<RespuestaUsuarioDto> {
    const usuario = await this.usuariosService.findById(currentUser.id);
    if (!usuario || !usuario.activo) {
      throw new NotFoundException('El usuario autenticado ya no existe.');
    }

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
    };
  }

  @Patch(':id/rol')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar el rol de un usuario (solo ADMIN)' })
  @ApiOkResponse({ type: RespuestaUsuarioDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse({ description: 'El usuario no existe' })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: ActualizarRolDto,
  ): Promise<RespuestaUsuarioDto> {
    return this.usuariosService.updateRole(id, input);
  }
}