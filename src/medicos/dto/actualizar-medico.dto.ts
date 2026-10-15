import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsString, MaxLength, ValidateIf } from 'class-validator';

export class ActualizarMedicoDto {
  @ApiPropertyOptional({ example: 'Neurología', maxLength: 120 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(120)
  especialidad?: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  disponible?: boolean;
}
