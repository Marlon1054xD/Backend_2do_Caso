import { ApiProperty } from '@nestjs/swagger';
import { Rol } from '../enums/rol.enum';

export class RespuestaUsuarioDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: Rol })
  rol: Rol;

  @ApiProperty()
  activo: boolean;
}