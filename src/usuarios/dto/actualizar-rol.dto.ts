import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Rol } from '../enums/rol.enum';

export class ActualizarRolDto {
  @ApiProperty({ enum: Rol })
  @IsEnum(Rol)
  rol: Rol;
}