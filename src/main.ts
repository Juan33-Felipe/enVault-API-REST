import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Valida todos los DTOs de entrada (body y params) con class-validator.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina los campos que no están en el DTO
      forbidNonWhitelisted: true, // y responde 400 si llegan campos extra
      transform: true, // convierte el payload en la clase DTO
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
