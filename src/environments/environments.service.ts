import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { Environment } from './environmentEntity';

@Injectable()
export class EnvironmentsService {
  constructor(
    @InjectRepository(Environment)
    private readonly environmentsRepository: Repository<Environment>,
  ) {}

  /**
   * Crea un entorno y devuelve su API key en claro (solo esta vez).
   * En la base de datos únicamente se guarda el hash.
   */
  async create(
    name: string,
    description?: string,
  ): Promise<{ environment: Environment; apiKey: string }> {
    const normalizedName = name.trim().toUpperCase();
    if (!normalizedName) {
      throw new BadRequestException('El nombre es obligatorio');
    }

    const exists = await this.environmentsRepository.findOne({
      where: { name: normalizedName },
    });
    if (exists) {
      throw new ConflictException('El entorno ya existe');
    }

    const apiKey = 'env_' + randomBytes(24).toString('hex');
    const saved = await this.environmentsRepository.save(
      this.environmentsRepository.create({
        name: normalizedName,
        description: description ?? null,
        apiKeyHash: this.hashApiKey(apiKey),
      }),
    );

    // El hash nunca sale en la respuesta.
    const { apiKeyHash: _omit, ...environment } = saved;
    return { environment: environment as Environment, apiKey };
  }

  /** Lista los entornos (sin el hash, gracias a select: false). */
  findAll(): Promise<Environment[]> {
    return this.environmentsRepository.find({ order: { createdAt: 'ASC' } });
  }

  /**
   * Contrato con AuthGuard: recibe la API key en claro y devuelve el entorno
   * al que pertenece, o null. No lanza excepciones.
   */
  findByApiKey(apiKey: string): Promise<Environment | null> {
    return this.environmentsRepository.findOne({
      where: { apiKeyHash: this.hashApiKey(apiKey) },
    });
  }

  // SHA-256 sin sal a propósito: hay que poder buscar por el hash.
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }
}
