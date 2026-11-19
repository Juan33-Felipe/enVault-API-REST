import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditLog, AuditStatus } from './auditLogEntity';

export interface AuditEntry {
  action: AuditAction;
  actor: string;
  status: AuditStatus;
  target?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Registra un evento de auditoría de forma inmutable (solo inserción).
   * Contrato con AuthGuard y SecretsService: nunca lanza excepciones.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.auditRepository.insert({
        action: entry.action,
        actor: entry.actor,
        status: entry.status,
        target: entry.target ?? null,
        ipAddress: entry.ipAddress ?? null,
      });
    } catch (error) {
      this.logger.error('No se pudo registrar la auditoría', error);
    }
  }

  /** Consulta los registros más recientes de la Caja Negra (solo lectura). */
  findAll(limit = 100): Promise<AuditLog[]> {
    return this.auditRepository.find({
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}
