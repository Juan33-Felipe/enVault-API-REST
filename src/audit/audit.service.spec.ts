import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditAction, AuditLog, AuditStatus } from './auditLogEntity';
import { AuditService } from './AuditService';

describe('AuditService', () => {
  let service: AuditService;
  const repository = {
    insert: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: repository },
      ],
    }).compile();

    service = module.get(AuditService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('log llama a insert con los datos completos cuando vienen target e ipAddress', async () => {
    repository.insert.mockResolvedValue({ identifiers: [{ id: 'uuid-1' }] });

    await service.log({
      action: AuditAction.READ_SECRET,
      actor: 'PRODUCCION',
      status: AuditStatus.SUCCESS,
      target: 'DB_PASSWORD',
      ipAddress: '127.0.0.1',
    });

    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(repository.insert).toHaveBeenCalledWith({
      action: AuditAction.READ_SECRET,
      actor: 'PRODUCCION',
      status: AuditStatus.SUCCESS,
      target: 'DB_PASSWORD',
      ipAddress: '127.0.0.1',
    });
  });

  it('log envia target e ipAddress en null cuando no vienen en la entrada', async () => {
    repository.insert.mockResolvedValue({ identifiers: [{ id: 'uuid-2' }] });

    await service.log({
      action: AuditAction.AUTH_FAILED,
      actor: 'anonymous',
      status: AuditStatus.FAILED,
    });

    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(repository.insert).toHaveBeenCalledWith({
      action: AuditAction.AUTH_FAILED,
      actor: 'anonymous',
      status: AuditStatus.FAILED,
      target: null,
      ipAddress: null,
    });
  });

  it('log no lanza error si insert falla y registra el fallo en el Logger', async () => {
    const dbError = new Error('Fallo de conexión a PostgreSQL');
    repository.insert.mockRejectedValue(dbError);
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(
      service.log({
        action: AuditAction.CREATE_SECRET,
        actor: 'QA',
        status: AuditStatus.SUCCESS,
        target: 'API_TOKEN',
      }),
    ).resolves.toBeUndefined();

    expect(loggerSpy).toHaveBeenCalledWith(
      'No se pudo registrar la auditoría',
      dbError,
    );
  });

  it('findAll devuelve registros ordenados por timestamp DESC con limite 100 por defecto', async () => {
    const logs = [{ id: 'uuid-1', action: AuditAction.READ_SECRET }];
    repository.find.mockResolvedValue(logs);

    await expect(service.findAll()).resolves.toBe(logs);
    expect(repository.find).toHaveBeenCalledWith({
      order: { timestamp: 'DESC' },
      take: 100,
    });
  });

  it('findAll respeta un limite personalizado', async () => {
    repository.find.mockResolvedValue([]);

    await expect(service.findAll(25)).resolves.toEqual([]);
    expect(repository.find).toHaveBeenCalledWith({
      order: { timestamp: 'DESC' },
      take: 25,
    });
  });
});
