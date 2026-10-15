import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('pacientes')
export class Paciente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, nullable: true })
  telefono: string | null;

  @OneToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}
