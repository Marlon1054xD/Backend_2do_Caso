import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EstadoCita } from '../entities/cita.entity';

export class ActualizarEstadoCitaDto {
  @ApiProperty({
    enum: [EstadoCita.COMPLETADA],
    example: EstadoCita.COMPLETADA,
  })
  @IsEnum(EstadoCita)
  estado: EstadoCita;
}
