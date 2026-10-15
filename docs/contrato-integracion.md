# Contrato de integración de seguridad

## Exports y rutas

`AuthModule` (`src/auth/auth.module.ts`) exporta exactamente `JwtAuthGuard`, `RolesGuard`, `PassportModule` y `JwtModule`.

Los componentes reutilizables están en:

- `src/auth/guards/jwt-auth.guard.ts`: `JwtAuthGuard`.
- `src/auth/guards/roles.guard.ts`: `RolesGuard`.
- `src/auth/decorators/roles.decorator.ts`: `Roles` y `ROLES_KEY`.
- `src/auth/decorators/current-user.decorator.ts`: `CurrentUser`.
- `src/auth/interfaces/usuario-autenticado.interface.ts`: `UsuarioAutenticado`.

`UsuariosModule` exporta `TypeOrmModule` y `UsuariosService`. No importa `AuthModule`; los controladores de usuarios se registran en `AuthModule` para evitar una dependencia circular.

## Usuario, rol y request.user

Importa la entidad y el enum así:

```ts
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/enums/rol.enum';
```

La forma garantizada en un handler después de `JwtAuthGuard` es:

```ts
interface UsuarioAutenticado {
  id: number;
  rol: Rol;
}
```

La estrategia consulta el usuario por `sub` en MySQL en cada petición, verifica que exista y esté activo, y toma el rol actual de la base de datos. El token no es la fuente de autoridad para el rol.

## Proteger otros módulos

Importa `AuthModule` en el módulo que contiene el controlador. Después aplica los guards y decoradores necesarios:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Get('recurso-administrativo')
listar() {}

@UseGuards(JwtAuthGuard)
@Get('mi-recurso')
consultar(@CurrentUser() usuario: UsuarioAutenticado) {}
```

Si solo se requiere autenticación, basta `@UseGuards(JwtAuthGuard)`. `RolesGuard` permite rutas sin metadatos `@Roles`; si se especifican roles y el usuario no cumple, responde `403`. Sin credenciales válidas, `JwtAuthGuard` responde `401`.

Para usar el repositorio, importa `UsuariosModule`; este registra y exporta `TypeOrmModule` junto con el repositorio de `Usuario`:

```ts
@Module({
  imports: [UsuariosModule],
})
export class ModuloConsumidor {}
```

En el proveedor consumidor se puede inyectar `@InjectRepository(Usuario) repository: Repository<Usuario>`.

Los únicos endpoints públicos son `POST /auth/register` y `POST /auth/login`. El registro solo recibe `nombre`, `email` y `password`; asigna siempre `Rol.PACIENTE`.

## Pendientes del equipo

- Esteban: crear los perfiles médico y paciente y vincular el alta `PACIENTE` con su perfil. Esta entrega no crea esas entidades ni relaciones.
- Luis: implementar el módulo de citas. Esta entrega no agrega rutas ni relaciones de citas.