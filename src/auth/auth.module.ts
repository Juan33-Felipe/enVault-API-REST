import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Module({
  // Declaramos los servicios y guards que le pertenecen a este módulo
  providers: [AuthService, AuthGuard],
  
  // Exportamos el Guard para que el controlador de Secrets lo pueda usar para proteger sus rutas
  exports: [AuthService, AuthGuard], 
})
export class AuthModule {}