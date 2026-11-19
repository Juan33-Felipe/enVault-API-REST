/**
 * ============================================================================
 * ✈️ ENTIDAD: AUDIT LOGS (LA CAJA NEGRA)
 * ============================================================================
 * Define la tabla que actúa como registro inmutable de trazabilidad ("Caja Negra").
 *
 * Aquí se registra cada acción importante de la API: quién pidió un secreto,
 * quién falló al autenticarse o quién creó un entorno. Esta tabla es solo de
 * inserción y lectura (nunca se actualizan ni borran registros para garantizar
 * trazabilidad real).
 * ============================================================================
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditAction {
  AUTH_FAILED = 'AUTH_FAILED',
  CREATE_ENVIRONMENT = 'CREATE_ENVIRONMENT',
  CREATE_SECRET = 'CREATE_SECRET',
  READ_SECRET = 'READ_SECRET',
  READ_ALL_SECRETS = 'READ_ALL_SECRETS',
  UPDATE_SECRET = 'UPDATE_SECRET',
  DELETE_SECRET = 'DELETE_SECRET',
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export { AuditStatus as AuditLogStatus };

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Se mantiene como varchar para permitir nuevas acciones sin migrar la BD.
  @Column({ type: 'varchar', length: 255 })
  action: string;

  // Quién realizó la acción (nombre del entorno o 'anonymous').
  @Column({ type: 'varchar', length: 255 })
  actor: string;

  // Recurso afectado (nombre del secreto o ruta; nunca valores sensibles).
  @Column({ type: 'varchar', length: 255, nullable: true })
  target: string | null;

  @Column({
    type: 'enum',
    enum: AuditStatus,
  })
  status: AuditStatus;

  // Dirección IP desde la que se realizó la petición.
  @Column({ type: 'varchar', name: 'ip_address', length: 255, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
