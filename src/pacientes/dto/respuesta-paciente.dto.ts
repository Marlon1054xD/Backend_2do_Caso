import { ApiProperty } from '@nestjs/swagger';
import { RespuestaUsuarioDto } from '../../usuarios/dto/respuesta-usuario.dto';

export class RespuestaPacienteDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  telefono: string | null;

  @ApiProperty({ type: RespuestaUsuarioDto })
  usuario: RespuestaUsuarioDto;
}
