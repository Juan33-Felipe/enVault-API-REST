import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Environment } from './environmentEntity';
import { EnvironmentsService } from './environments.service';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('EnvironmentsService', () => {
  let service: EnvironmentsService;
  const repository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data: Partial<Environment>) => data),
    save: jest.fn((data: Partial<Environment>) =>
      Promise.resolve({ id: 'uuid-1', createdAt: new Date(), ...data }),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvironmentsService,
        { provide: getRepositoryToken(Environment), useValue: repository },
      ],
    }).compile();

    service = module.get(EnvironmentsService);
  });

  it('create devuelve una apiKey env_ y guarda solo su hash', async () => {
    repository.findOne.mockResolvedValue(null);

    const { environment, apiKey } = await service.create(' produccion ');

    expect(apiKey).toMatch(/^env_[0-9a-f]{48}$/);
    const saved = repository.save.mock.calls[0][0];
    expect(saved.name).toBe('PRODUCCION');
    expect(saved.description).toBeNull();
    expect(saved.apiKeyHash).toHaveLength(64);
    expect(saved.apiKeyHash).not.toBe(apiKey);
    expect(saved.apiKeyHash).toBe(sha256(apiKey));
    expect(environment).not.toHaveProperty('apiKeyHash');
  });

  it('create con nombre duplicado lanza ConflictException', async () => {
    repository.findOne.mockResolvedValue({ id: 'x', name: 'QA' });

    await expect(service.create('qa')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('findByApiKey busca por el hash, no por la key en claro', async () => {
    const env = { id: 'uuid-1', name: 'QA' };
    repository.findOne.mockResolvedValue(env);

    await expect(service.findByApiKey('env_abc')).resolves.toBe(env);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { apiKeyHash: sha256('env_abc') },
    });
  });

  it('findByApiKey devuelve null si la key no existe', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findByApiKey('env_nada')).resolves.toBeNull();
  });
});
