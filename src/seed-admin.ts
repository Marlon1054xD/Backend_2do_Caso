import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsuariosService } from './usuarios/usuarios.service';

async function seedAdmin(): Promise<void> {
  const nombre = process.env.ADMIN_NOMBRE?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!nombre || !email || !password) {
    throw new Error(
      'Debes definir ADMIN_NOMBRE, ADMIN_EMAIL y ADMIN_PASSWORD en el entorno.',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const created = await app.get(UsuariosService).createAdminIfMissing({
      nombre,
      email,
      password,
    });
    console.log(
      created
        ? `Administrador ${email} creado.`
        : `No se modificó ${email}: ya existe un usuario con ese correo.`,
    );
  } finally {
    await app.close();
  }
}

seedAdmin().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});