import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Paciente } from './entities/paciente.entity';
import { PacientesController } from './pacientes.controller';
import { PacientesService } from './pacientes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Paciente]), AuthModule],
  controllers: [PacientesController],
  providers: [PacientesService],
  exports: [TypeOrmModule],
})
export class PacientesModule {}
