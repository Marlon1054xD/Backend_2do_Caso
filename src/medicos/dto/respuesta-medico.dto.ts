import { ApiProperty } from '@nestjs/swagger';
import { RespuestaUsuarioDto } from '../../usuarios/dto/respuesta-usuario.dto';

export class RespuestaMedicoDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  especialidad: string;

  @ApiProperty()
  disponible: boolean;

  @ApiProperty({ type: RespuestaUsuarioDto })
  usuario: RespuestaUsuarioDto;
}
