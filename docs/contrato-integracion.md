# Contrato de integración MediControl

## Entidades y relaciones

- `Usuario` es la identidad compartida: nombre, email, contraseña, rol y estado
  activo se almacenan únicamente en `usuarios`.
- `Medico` contiene `especialidad` y `disponible`; posee una relación
  `OneToOne` con `Usuario`, con FK única `usuario_id`. El usuario enlazado debe
  tener rol `MEDICO`.
- `Paciente` contiene el teléfono opcional y posee una relación `OneToOne` con
  `Usuario`, con FK única `usuario_id`. El usuario enlazado debe tener rol
  `PACIENTE`.
- `Cita` contiene fecha, hora y estado (`programada`, `cancelada` o
  `completada`), con relaciones `ManyToOne` a `Paciente` y `Medico`.
- No se copian nombre, email ni contraseña a los perfiles. Los endpoints
  serializan datos de usuario sin contraseña.
- La disponibilidad del médico es general. La disponibilidad para una fecha
  u hora se resuelve al reservar una cita.
- La fecha y la hora de una cita son valores locales de negocio en
  `America/Bogota`; se rechazan fechas/hora inválidas y citas pasadas.

Las restricciones de rol se verifican al asociar el perfil. `PATCH
/usuarios/:id/rol` rechaza cambios que dejen un perfil médico con un rol que no
sea `MEDICO` o un perfil de paciente con un rol que no sea `PACIENTE`. Los
perfiles únicos y los cambios de rol se validan bajo bloqueo transaccional del
usuario, además de la restricción única de la FK.

## Exports y rutas

`AuthModule` (`src/auth/auth.module.ts`) exporta exactamente `JwtAuthGuard`, `RolesGuard`, `PassportModule` y `JwtModule`.

Los componentes reutilizables están en:

- `src/auth/guards/jwt-auth.guard.ts`: `JwtAuthGuard`.
- `src/auth/guards/roles.guard.ts`: `RolesGuard`.
- `src/auth/decorators/roles.decorator.ts`: `Roles` y `ROLES_KEY`.
- `src/auth/decorators/current-user.decorator.ts`: `CurrentUser`.
- `src/auth/interfaces/usuario-autenticado.interface.ts`: `UsuarioAutenticado`.

`UsuariosModule` exporta `TypeOrmModule` y `UsuariosService`. No importa
`AuthModule`; los controladores de usuarios se registran en `AuthModule` para
evitar una dependencia circular. También registra los metadatos de `Medico` y
`Paciente` para poder validar roles y crear el perfil de registro.

`MedicosModule` y `PacientesModule` importan `AuthModule` para reutilizar los
guards existentes y exportan `TypeOrmModule` para que otros módulos puedan
inyectar sus repositorios:

```ts
@Module({
  imports: [MedicosModule, PacientesModule],
})
export class ModuloConsumidor {}
```

El módulo consumidor puede inyectar
`@InjectRepository(Medico) Repository<Medico>` o
`@InjectRepository(Paciente) Repository<Paciente>`. `Medico` y `Paciente` se
importan desde `src/medicos/entities/medico.entity.ts` y
`src/pacientes/entities/paciente.entity.ts`, respectivamente.

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

Los únicos endpoints públicos son `POST /auth/register` y `POST /auth/login`.
El registro solo recibe `nombre`, `email` y `password`; asigna siempre
`Rol.PACIENTE` y crea `Usuario` y `Paciente` en una única transacción. No se
acepta un rol en el cuerpo. Los usuarios PACIENTE creados antes de tener este
perfil pueden ser vinculados por ADMIN mediante `POST /pacientes`.

## API de médicos y pacientes

Todas las respuestas de perfil incluyen `usuario` con `id`, `nombre`, `email`,
`rol` y `activo`; nunca incluyen `password`.

| Método | Ruta            | Acceso   | Comportamiento                                    |
| ------ | --------------- | -------- | ------------------------------------------------- |
| POST   | `/medicos`      | ADMIN    | Crea un perfil para un usuario existente MEDICO   |
| GET    | `/medicos`      | JWT      | Lista solo médicos disponibles con usuario activo |
| PATCH  | `/medicos/:id`  | ADMIN    | Cambia `especialidad` y/o `disponible`            |
| POST   | `/pacientes`    | ADMIN    | Crea un perfil para un usuario existente PACIENTE |
| GET    | `/pacientes`    | ADMIN    | Lista pacientes                                   |
| GET    | `/pacientes/me` | PACIENTE | Consulta solo el perfil de la cuenta autenticada  |
| PATCH  | `/pacientes/me` | PACIENTE | Actualiza únicamente `telefono` propio            |
| POST   | `/citas` | PACIENTE | Reserva para el paciente autenticado |
| GET    | `/citas` | JWT | ADMIN todas; MEDICO/PACIENTE solo sus citas |
| PATCH  | `/citas/:id/estado` | MEDICO | Completa una cita propia programada |
| PATCH  | `/citas/:id/cancelar` | PACIENTE/ADMIN | Cancela cita programada propia/cualquiera |

`POST /citas` recibe únicamente `medicoId`, `fecha` (`YYYY-MM-DD`) y `hora`
(`HH:mm`). El paciente se determina mediante `request.user.id`; el cliente no
puede asignar paciente ni estado. Se crean siempre en estado `programada`.
Los horarios ocupados devuelven `409`. La reserva y la cancelación bloquean la
fila del médico con bloqueo pesimista dentro de una transacción para evitar
doble reserva concurrente. Los turnos cancelados se pueden reutilizar y los
completados permanecen ocupados.

`GET /medicos` no comprueba agenda ni disponibilidad para fecha/hora.
No existe acceso general de médicos a pacientes; la consulta de datos mínimos
por médicos queda reservada al contexto del módulo de citas.

Ejemplos de cuerpos:

```json
{
  "usuarioId": 12,
  "especialidad": "Cardiología",
  "disponible": true
}
```

```json
{
  "usuarioId": 34,
  "telefono": "+1 555 0100"
}
```

```json
{
  "telefono": "+1 555 0101"
}
```

`PATCH /medicos/:id` acepta uno o ambos campos:

```json
{
  "especialidad": "Neurología",
  "disponible": false
}
```

Los cuerpos de registro y creación de usuario mantienen sus contratos
existentes; no deben incluir `rol` en `POST /auth/register`.

La colección importable de Postman se encuentra en
[`postman/MediControl.postman_collection.json`](../postman/MediControl.postman_collection.json).
