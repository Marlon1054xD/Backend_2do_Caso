# Modelo entidad-relación

```mermaid
erDiagram
    USUARIO ||--o| MEDICO : "tiene perfil si rol MEDICO"
    USUARIO ||--o| PACIENTE : "tiene perfil si rol PACIENTE"

    USUARIO {
        int id PK
        varchar nombre
        varchar email UK
        varchar password
        enum rol
        boolean activo
    }

    MEDICO {
        int id PK
        varchar especialidad
        boolean disponible
        int usuario_id FK,UK
    }

    PACIENTE {
        int id PK
        varchar telefono "opcional"
        int usuario_id FK,UK
    }
```

`Usuario` almacena los datos de identidad y autenticación; los perfiles no
duplican nombre, email ni contraseña. `usuario_id` es una FK única en ambos
perfiles y se valida que el rol del usuario coincida con su perfil. La
disponibilidad del médico es general, no una disponibilidad por fecha/hora.

**Cita está pendiente** y no forma parte de este diagrama ni de esta entrega.
