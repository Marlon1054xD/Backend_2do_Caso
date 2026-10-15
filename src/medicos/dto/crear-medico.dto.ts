import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearMedicoDto {
  @ApiProperty({
    example: 12,
    description: 'ID de un usuario existente con rol MEDICO',
  })
  @IsInt()
  @Min(1)
  usuarioId: number;

  @ApiProperty({ example: 'Cardiología', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  especialidad: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  disponible?: boolean;
}
