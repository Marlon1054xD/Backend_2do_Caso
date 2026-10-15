import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Rol } from '../enums/rol.enum';

export class CrearUsuarioDto {
  @ApiProperty({ example: 'Ana Pérez' })
  @IsString()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  @MaxLength(180)
  email: string;

  @ApiProperty({ minLength: 8, writeOnly: true })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: Rol, default: Rol.PACIENTE })
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;
}