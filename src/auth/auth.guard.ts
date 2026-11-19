import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditService } from '../audit/AuditService';
import { AuditAction, AuditStatus } from '../audit/auditLogEntity';
import { AuthenticatedRequest } from './authenticated-request';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers['x-api-key'];
    const apiKey = typeof header === 'string' ? header : '';
    const environment = await this.authService.validateApiKey(apiKey);

    if (!environment) {
      await this.auditService.log({
        action: AuditAction.AUTH_FAILED,
        actor: 'anonymous',
        status: AuditStatus.FAILED,
        target: request.originalUrl,
        ipAddress: request.ip,
      });
      throw new UnauthorizedException('API key inválida o ausente');
    }

    request.environment = environment;
    return true;
  }
}
