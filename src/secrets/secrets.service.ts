import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/AuditService';
import { AuditAction, AuditStatus } from '../audit/auditLogEntity';
import { Environment } from '../environments/environmentEntity';
import { EncryptionService } from './encryption.service';
import { Secret } from './secretEntity';

const KEY_NAME_MAX_LENGTH = 150;
const KEY_NAME_PATTERN = /^[A-Z0-9_]+$/;
const PG_UNIQUE_VIOLATION = '23505';

/**
 * La Bóveda: guarda y entrega secretos de un entorno.
 *
 * REGLA DE ORO: toda consulta filtra por `environment: { id: env.id }`.
 * `env` llega siempre del AuthGuard (req.environment), nunca del cliente.
 * Los valores de los secretos nunca se escriben en la auditoría, logs ni errores.
 */
@Injectable()
export class SecretsService {
  constructor(
    @InjectRepository(Secret)
    private readonly secretsRepository: Repository<Secret>,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    env: Environment,
    keyName: unknown,
    value: unknown,
    ip?: string,
  ): Promise<{ id: string; keyName: string; createdAt: Date }> {
    const action = AuditAction.CREATE_SECRET;
    const name = await this.validateKeyName(env, action, keyName, ip);
    await this.validateValue(env, action, name, value, ip);

    if (await this.findInEnvironment(env, name)) {
      await this.fail(env, action, name, ip);
      throw new ConflictException('El secreto ya existe en este entorno');
    }

    let saved: Secret;
    try {
      saved = await this.secretsRepository.save(
        this.secretsRepository.create({
          keyName: name,
          encryptedValue: this.encryptionService.encrypt(value as string),
          environment: { id: env.id },
        }),
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        await this.fail(env, action, name, ip);
        throw new ConflictException('El secreto ya existe en este entorno');
      }
      throw error;
    }

    await this.succeed(env, action, name, ip);
    return { id: saved.id, keyName: saved.keyName, createdAt: saved.createdAt };
  }

  async findAll(
    env: Environment,
    ip?: string,
  ): Promise<{ keyName: string; value: string }[]> {
    const action = AuditAction.READ_ALL_SECRETS;
    const secrets = await this.secretsRepository.find({
      where: { environment: { id: env.id } },
      order: { keyName: 'ASC' },
    });

    const result: { keyName: string; value: string }[] = [];
    for (const secret of secrets) {
      result.push({
        keyName: secret.keyName,
        value: await this.decryptOrFail(env, action, secret, ip, undefined),
      });
    }

    await this.succeed(env, action, undefined, ip);
    return result;
  }

  async findOne(
    env: Environment,
    keyName: unknown,
    ip?: string,
  ): Promise<{ keyName: string; value: string }> {
    const action = AuditAction.READ_SECRET;
    const secret = await this.findOrFail(env, action, keyName, ip);
    const value = await this.decryptOrFail(
      env,
      action,
      secret,
      ip,
      secret.keyName,
    );

    await this.succeed(env, action, secret.keyName, ip);
    return { keyName: secret.keyName, value };
  }

  /** Rotación: vuelve a cifrar el nuevo valor con un IV nuevo. */
  async update(
    env: Environment,
    keyName: unknown,
    value: unknown,
    ip?: string,
  ): Promise<{ keyName: string; updatedAt: Date }> {
    const action = AuditAction.UPDATE_SECRET;
    const name = await this.validateKeyName(env, action, keyName, ip);
    await this.validateValue(env, action, name, value, ip);
    const secret = await this.findOrFail(env, action, name, ip);

    secret.encryptedValue = this.encryptionService.encrypt(value as string);
    const saved = await this.secretsRepository.save(secret);

    await this.succeed(env, action, secret.keyName, ip);
    return { keyName: saved.keyName, updatedAt: saved.updatedAt };
  }

  async remove(env: Environment, keyName: unknown, ip?: string): Promise<void> {
    const action = AuditAction.DELETE_SECRET;
    const secret = await this.findOrFail(env, action, keyName, ip);

    // `secret` se obtuvo filtrando por env.id, así que solo borra de este entorno.
    await this.secretsRepository.remove(secret);

    await this.succeed(env, action, secret.keyName, ip);
  }

  // ---------------------------------------------------------------------------

  private findInEnvironment(
    env: Environment,
    keyName: string,
  ): Promise<Secret | null> {
    return this.secretsRepository.findOne({
      where: { keyName, environment: { id: env.id } },
    });
  }

  private async findOrFail(
    env: Environment,
    action: AuditAction,
    keyName: unknown,
    ip?: string,
  ): Promise<Secret> {
    const name = await this.validateKeyName(env, action, keyName, ip);
    const secret = await this.findInEnvironment(env, name);
    if (!secret) {
      await this.fail(env, action, name, ip);
      throw new NotFoundException('Secreto no encontrado');
    }
    return secret;
  }

  /** Devuelve el keyName normalizado (trim + mayúsculas) o lanza 400. */
  private async validateKeyName(
    env: Environment,
    action: AuditAction,
    keyName: unknown,
    ip?: string,
  ): Promise<string> {
    const name =
      typeof keyName === 'string' ? keyName.trim().toUpperCase() : '';

    if (
      name.length === 0 ||
      name.length > KEY_NAME_MAX_LENGTH ||
      !KEY_NAME_PATTERN.test(name)
    ) {
      await this.fail(
        env,
        action,
        typeof keyName === 'string'
          ? keyName.slice(0, KEY_NAME_MAX_LENGTH)
          : undefined,
        ip,
      );
      throw new BadRequestException(
        `keyName debe tener entre 1 y ${KEY_NAME_MAX_LENGTH} caracteres y solo letras, números o _`,
      );
    }
    return name;
  }

  private async validateValue(
    env: Environment,
    action: AuditAction,
    keyName: string,
    value: unknown,
    ip?: string,
  ): Promise<void> {
    if (typeof value !== 'string' || value.trim().length === 0) {
      await this.fail(env, action, keyName, ip);
      throw new BadRequestException('value debe ser un texto no vacío');
    }
  }

  private async decryptOrFail(
    env: Environment,
    action: AuditAction,
    secret: Secret,
    ip: string | undefined,
    target: string | undefined,
  ): Promise<string> {
    try {
      return this.encryptionService.decrypt(secret.encryptedValue);
    } catch {
      // Ni el encryptedValue ni el detalle técnico salen de aquí.
      await this.fail(env, action, target ?? secret.keyName, ip);
      throw new InternalServerErrorException('No se pudo descifrar el secreto');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    const err = error as {
      code?: string;
      driverError?: { code?: string };
    } | null;
    return (
      err?.code === PG_UNIQUE_VIOLATION ||
      err?.driverError?.code === PG_UNIQUE_VIOLATION
    );
  }

  private succeed(
    env: Environment,
    action: AuditAction,
    target: string | undefined,
    ip?: string,
  ): Promise<void> {
    return this.audit(env, action, AuditStatus.SUCCESS, target, ip);
  }

  private fail(
    env: Environment,
    action: AuditAction,
    target: string | undefined,
    ip?: string,
  ): Promise<void> {
    return this.audit(env, action, AuditStatus.FAILED, target, ip);
  }

  private audit(
    env: Environment,
    action: AuditAction,
    status: AuditStatus,
    target: string | undefined,
    ipAddress?: string,
  ): Promise<void> {
    return this.auditService.log({
      action,
      actor: env.name,
      status,
      target,
      ipAddress,
    });
  }
}
