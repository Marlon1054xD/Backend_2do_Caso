import { Rol } from '../../usuarios/enums/rol.enum';

export interface UsuarioAutenticado {
  id: number;
  rol: Rol;
}