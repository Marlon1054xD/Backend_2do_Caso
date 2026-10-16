import { ApiProperty } from '@nestjs/swagger';
import { EstadoCita } from '../entities/cita.entity';

class PersonaCitaDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;
}

class PacienteCitaDto extends PersonaCitaDto {}

class MedicoCitaDto extends PersonaCitaDto {
  @ApiProperty()
  especialidad: string;
}

export class RespuestaCitaDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ format: 'date', example: '2027-03-10' })
  fecha: string;

  @ApiProperty({ example: '14:30:00' })
  hora: string;

  @ApiProperty({ enum: EstadoCita })
  estado: EstadoCita;

  @ApiProperty({ type: PacienteCitaDto })
  paciente: PacienteCitaDto;

  @ApiProperty({ type: MedicoCitaDto })
  medico: MedicoCitaDto;
}
