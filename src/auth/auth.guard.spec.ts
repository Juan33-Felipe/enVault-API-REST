import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../audit/AuditService';
import { AuditAction, AuditStatus } from '../audit/auditLogEntity';
import { Environment } from '../environments/environmentEntity';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './authenticated-request';

describe('AuthGuard', () => {
  const validateApiKey = jest.fn();
  const log = jest.fn();
  let guard: AuthGuard;
  let request: AuthenticatedRequest;
  let context: ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    validateApiKey.mockResolvedValue(null);
    log.mockResolvedValue(undefined);
    guard = new AuthGuard(
      { validateApiKey } as unknown as AuthService,
      { log } as unknown as AuditService,
    );
    request = {
      headers: {},
      originalUrl: '/secrets',
      ip: '127.0.0.1',
    } as AuthenticatedRequest;
    context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  });

  it('rechaza una petición sin cabecera y registra el fallo', async () => {
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(validateApiKey).toHaveBeenCalledWith('');
    expect(log).toHaveBeenCalledWith({
      action: AuditAction.AUTH_FAILED,
      actor: 'anonymous',
      status: AuditStatus.FAILED,
      target: '/secrets',
      ipAddress: '127.0.0.1',
    });
  });

  it('trata una cabecera de tipo arreglo como ausente', async () => {
    request.headers['x-api-key'] = ['clave-arreglo'];
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(validateApiKey).toHaveBeenCalledWith('');
    expect(JSON.stringify(log.mock.calls)).not.toContain('clave-arreglo');
  });

  it('rechaza una clave inválida sin registrarla', async () => {
    request.headers['x-api-key'] = 'clave-invalida';
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(validateApiKey).toHaveBeenCalledWith('clave-invalida');
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.AUTH_FAILED,
        status: AuditStatus.FAILED,
        actor: 'anonymous',
      }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('clave-invalida');
  });

  it('acepta una clave válida y asigna el entorno', async () => {
    const environment = { id: 'entorno-1', name: 'QA' } as Environment;
    request.headers['x-api-key'] = 'clave-valida';
    validateApiKey.mockResolvedValue(environment);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.environment).toBe(environment);
    expect(validateApiKey).toHaveBeenCalledWith('clave-valida');
    expect(log).not.toHaveBeenCalled();
  });
});
