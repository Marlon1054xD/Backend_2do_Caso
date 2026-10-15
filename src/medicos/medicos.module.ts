import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Medico } from './entities/medico.entity';
import { MedicosController } from './medicos.controller';
import { MedicosService } from './medicos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Medico]), AuthModule],
  controllers: [MedicosController],
  providers: [MedicosService],
  exports: [TypeOrmModule],
})
export class MedicosModule {}
