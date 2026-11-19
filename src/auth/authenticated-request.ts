import { Request } from 'express';
import { Environment } from '../environments/environmentEntity';

/**
 * Petición HTTP que ya pasó por el AuthGuard.
 * El guard identifica el entorno a partir del header `x-api-key` y lo deja
 * en `request.environment`. Los controladores deben tomar el entorno SOLO de aquí.
 */
export interface AuthenticatedRequest extends Request {
  environment: Environment;
}
