/**
 * ============================================================================
 * ✈️ ENTIDAD: AUDIT LOGS (LA CAJA NEGRA)
 * ============================================================================
 * Hola equipo. Este archivo es el corazón de nuestra "Caja Negra".
 * Define la tabla que actuará como nuestro registro o libro de visitas inmutable.
 * 
 * Aquí vamos a anotar TODO lo que pase en la API: quién pidió una llave, quién 
 * se equivocó de token, o quién borró un entorno. Esta tabla será solo de 
 * inserción y lectura (nunca vamos a actualizar ni borrar estos registros para 
 * garantizar la trazabilidad real).
 * 
 * Sigan los TODOs para crear los campos que rastrearán estos eventos.
 * ============================================================================
 */

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export { AuditStatus as AuditLogStatus };

@Entity('audit_logs')
export class AuditLog {
  // TODO: Crear columna 'id' como PrimaryGeneratedColumn tipo 'uuid'.
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // TODO: Crear columna 'action'. Debe ser string y no nula.
  // Ej: 'CREATE_SECRET', 'READ_SECRET', 'UPDATE_SECRET', 'DELETE_ENVIRONMENT'.
  @Column({ type: 'varchar', length: 255 })
  action: string;

  // TODO: Crear columna 'actor'. Debe ser string y no nula.
  // Representa quién hizo la acción (Ej: 'backend_ventas_prod' o 'admin_felipe').
  @Column({ type: 'varchar', length: 255 })
  actor: string;

  // TODO: Crear columna 'target'. Debe ser string y opcional.
  // Representa qué recurso fue afectado (Ej: el nombre de la llave que se intentó leer).
  @Column({ type: 'varchar', length: 255, nullable: true })
  target?: string;

  // TODO: Crear columna 'status'. Debe ser string.
  // Solo debe aceptar 'SUCCESS' o 'FAILED' (Recomendable usar un enum de TypeScript).
  @Column({
    type: 'enum',
    enum: AuditStatus,
  })
  status: AuditStatus;

  // TODO: Crear columna 'ipAddress'. Debe ser string y opcional.
  // Para rastrear desde qué dirección de red se hizo la petición a la API.
  @Column({ type: 'varchar', name: 'ip_address', length: 255, nullable: true })
  ipAddress?: string;

  // TODO: Crear columna 'timestamp' usando @CreateDateColumn().
  // Es el dato más crítico de la caja negra: el instante exacto en que ocurrió el evento.
  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
