import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, Matches, Min } from 'class-validator';

export class CrearCitaDto {
  @ApiProperty({ example: 8, minimum: 1 })
  @IsInt()
  @Min(1)
  medicoId: number;

  @ApiProperty({
    description:
      'Fecha de negocio en America/Bogota. Debe ser una fecha real y futura junto con la hora.',
    example: '2027-03-10',
    format: 'date',
  })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha: string;

  @ApiProperty({
    description: 'Hora local de negocio en America/Bogota, formato HH:mm.',
    example: '14:30',
    pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora: string;
}
