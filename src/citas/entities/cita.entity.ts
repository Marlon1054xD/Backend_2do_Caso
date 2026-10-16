import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Medico } from '../../medicos/entities/medico.entity';
import { Paciente } from '../../pacientes/entities/paciente.entity';

export enum EstadoCita {
  PROGRAMADA = 'programada',
  CANCELADA = 'cancelada',
  COMPLETADA = 'completada',
}

@Entity('citas')
export class Cita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'time' })
  hora: string;

  @Column({ type: 'enum', enum: EstadoCita, default: EstadoCita.PROGRAMADA })
  estado: EstadoCita;

  @ManyToOne(() => Paciente, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => Medico, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medico_id' })
  medico: Medico;
}
