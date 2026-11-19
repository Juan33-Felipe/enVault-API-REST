/**
 * ============================================================================
 * 🌍 ENTIDAD: ENVIRONMENTS (LOS ENTORNOS)
 * ============================================================================
 * Representa la tabla de Entornos (Ej: DESARROLLO, QA, PRODUCCION).
 * Cada entorno tiene su propia API key, y esa key decide qué secretos puede
 * ver un backend: es la base del aislamiento.
 *
 * Solo se guarda el hash SHA-256 de la API key, nunca la key en claro.
 * ============================================================================
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('environments')
export class Environment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Ej: 'PRODUCCION', 'DESARROLLO', 'QA'.
  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  // Hash SHA-256 en hex (64 caracteres) de la API key del entorno.
  // select: false evita que aparezca en los find() normales.
  @Column({
    name: 'api_key_hash',
    type: 'varchar',
    length: 64,
    unique: true,
    select: false,
  })
  apiKeyHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
