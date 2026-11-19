import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit/AuditService';
import { AuditAction, AuditStatus } from '../audit/auditLogEntity';
import { Environment } from '../environments/environmentEntity';
import { EncryptionService } from './encryption.service';
import { Secret } from './secretEntity';
import { SecretsService } from './secrets.service';

const env = { id: 'env-prod', name: 'PRODUCCION' } as Environment;
const IP = '10.0.0.1';

describe('SecretsService', () => {
  let service: SecretsService;

  const repository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data: Partial<Secret>) => data),
    save: jest.fn((data: Partial<Secret>) =>
      Promise.resolve({ id: 'secret-1', createdAt: new Date(), ...data }),
    ),
    remove: jest.fn(),
  };
  const encryptionService = {
    encrypt: jest.fn((plain: string) => `cifrado(${plain.length})`),
    decrypt: jest.fn(() => 'valor-descifrado'),
  };
  const auditService = { log: jest.fn() };

  const stored = (keyName = 'DB_PASSWORD') =>
    ({
      id: 'secret-1',
      keyName,
      encryptedValue: 'iv:tag:data',
      environment: { id: env.id },
    }) as Secret;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretsService,
        { provide: getRepositoryToken(Secret), useValue: repository },
        { provide: EncryptionService, useValue: encryptionService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(SecretsService);
  });

  describe('aislamiento por entorno', () => {
    it('findOne busca por keyName y environment.id', async () => {
      repository.findOne.mockResolvedValue(stored());

      await service.findOne(env, 'DB_PASSWORD', IP);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { keyName: 'DB_PASSWORD', environment: { id: env.id } },
      });
    });

    it('findAll solo lista los secretos del entorno', async () => {
      repository.find.mockResolvedValue([stored()]);

      const result = await service.findAll(env, IP);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { environment: { id: env.id } } }),
      );
      expect(result).toEqual([
        { keyName: 'DB_PASSWORD', value: 'valor-descifrado' },
      ]);
    });

    it('create guarda el secreto ligado al entorno autenticado', async () => {
      repository.findOne.mockResolvedValue(null);

      await service.create(env, 'DB_PASSWORD', 'superSecreta123', IP);

      expect(repository.save.mock.calls[0][0]).toMatchObject({
        environment: { id: env.id },
      });
    });
  });

  describe('create', () => {
    it('guarda el valor cifrado, nunca el texto plano, y no lo devuelve', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.create(
        env,
        ' db_password ',
        'superSecreta123',
        IP,
      );

      const saved = repository.save.mock.calls[0][0];
      expect(encryptionService.encrypt).toHaveBeenCalledWith('superSecreta123');
      expect(saved.encryptedValue).toBe('cifrado(15)');
      expect(JSON.stringify(saved)).not.toContain('superSecreta123');
      expect(result).toEqual({
        id: 'secret-1',
        keyName: 'DB_PASSWORD',
        createdAt: expect.any(Date),
      });
      expect(auditService.log).toHaveBeenCalledWith({
        action: AuditAction.CREATE_SECRET,
        actor: env.name,
        status: AuditStatus.SUCCESS,
        target: 'DB_PASSWORD',
        ipAddress: IP,
      });
    });

    it.each([
      ['keyName vacío', '', 'valor'],
      ['keyName con caracteres inválidos', 'db-password', 'valor'],
      ['keyName de más de 150 caracteres', 'A'.repeat(151), 'valor'],
      ['keyName que no es texto', 123, 'valor'],
      ['value vacío', 'DB_PASSWORD', '   '],
      ['value que no es texto', 'DB_PASSWORD', { a: 1 }],
    ])('%s → 400 y auditoría FAILED', async (_caso, keyName, value) => {
      await expect(service.create(env, keyName, value, IP)).rejects.toThrow(
        BadRequestException,
      );

      expect(repository.save).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.CREATE_SECRET,
          status: AuditStatus.FAILED,
        }),
      );
    });

    it('un keyName que ya existe en el entorno → 409', async () => {
      repository.findOne.mockResolvedValue(stored());

      await expect(
        service.create(env, 'DB_PASSWORD', 'valor', IP),
      ).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('el error 23505 de PostgreSQL se traduce a 409', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.save.mockRejectedValueOnce({ code: '23505' });

      await expect(
        service.create(env, 'DB_PASSWORD', 'valor', IP),
      ).rejects.toThrow(ConflictException);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditStatus.FAILED }),
      );
    });
  });

  describe('findOne', () => {
    it('devuelve el valor descifrado y audita SUCCESS', async () => {
      repository.findOne.mockResolvedValue(stored());

      await expect(service.findOne(env, 'db_password', IP)).resolves.toEqual({
        keyName: 'DB_PASSWORD',
        value: 'valor-descifrado',
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.READ_SECRET,
          status: AuditStatus.SUCCESS,
        }),
      );
    });

    it('si no existe → 404 y auditoría FAILED', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(env, 'NO_EXISTE', IP)).rejects.toThrow(
        NotFoundException,
      );
      expect(auditService.log).toHaveBeenCalledWith({
        action: AuditAction.READ_SECRET,
        actor: env.name,
        status: AuditStatus.FAILED,
        target: 'NO_EXISTE',
        ipAddress: IP,
      });
    });

    it('si decrypt falla → 500 genérico, sin exponer el valor cifrado', async () => {
      repository.findOne.mockResolvedValue(stored());
      encryptionService.decrypt.mockImplementationOnce(() => {
        throw new Error('Unsupported state or unable to authenticate data');
      });

      const error = await service
        .findOne(env, 'DB_PASSWORD', IP)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect((error as Error).message).toBe('No se pudo descifrar el secreto');
      expect(JSON.stringify(error)).not.toContain('iv:tag:data');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditStatus.FAILED }),
      );
    });
  });

  describe('update y remove', () => {
    it('update vuelve a cifrar el nuevo valor', async () => {
      repository.findOne.mockResolvedValue(stored());

      await service.update(env, 'DB_PASSWORD', 'nuevoValor', IP);

      expect(encryptionService.encrypt).toHaveBeenCalledWith('nuevoValor');
      expect(repository.save.mock.calls[0][0].encryptedValue).toBe(
        'cifrado(10)',
      );
    });

    it('update de un secreto inexistente → 404', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(env, 'NO_EXISTE', 'valor', IP),
      ).rejects.toThrow(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('remove borra el secreto encontrado en el entorno', async () => {
      const secret = stored();
      repository.findOne.mockResolvedValue(secret);

      await service.remove(env, 'DB_PASSWORD', IP);

      expect(repository.remove).toHaveBeenCalledWith(secret);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DELETE_SECRET,
          status: AuditStatus.SUCCESS,
        }),
      );
    });

    it('remove de un secreto inexistente → 404', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(env, 'NO_EXISTE', IP)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  it('nunca registra valores de secretos en la auditoría', async () => {
    repository.findOne.mockResolvedValueOnce(null);
    await service.create(env, 'DB_PASSWORD', 'superSecreta123', IP);
    repository.findOne.mockResolvedValueOnce(stored());
    await service.update(env, 'DB_PASSWORD', 'otraClave456', IP);

    const logged = JSON.stringify(auditService.log.mock.calls);
    expect(logged).not.toContain('superSecreta123');
    expect(logged).not.toContain('otraClave456');
  });
});
