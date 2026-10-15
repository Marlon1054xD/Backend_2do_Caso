import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistroPacienteDto {
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
}