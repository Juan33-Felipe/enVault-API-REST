import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * ============================================================================
 * Este archivo interceptará las peticiones antes de que lleguen a la bóveda.
 * Su trabajo es revisar si la petición HTTP trae un token válido en los Headers.
 * ============================================================================
 */
@Injectable()
export class AuthGuard implements CanActivate {
  
  // TODO: Inyectar el AuthService en el constructor para usar su lógica de validación

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    
    // TODO: Extraer la "request" del ExecutionContext
    // TODO: Buscar el token en request.headers.authorization
    // TODO: Validar el token. Si es falso, NestJS arrojará un 403 Forbidden automáticamente.

    return true; // TODO: Temporalmente en true para no bloquear el desarrollo inicial.
  }
}