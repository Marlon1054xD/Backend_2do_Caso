import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CrearPacienteDto {
  @ApiProperty({
    example: 34,
    description: 'ID de un usuario existente con rol PACIENTE',
  })
  @IsInt()
  @Min(1)
  usuarioId: number;

  @ApiPropertyOptional({
    example: '+1 555 0100',
    maxLength: 30,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string | null;
}
