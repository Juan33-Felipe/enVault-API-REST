/**
 * ============================================================================
 * 🔐 ENTIDAD: SECRETS (LA BÓVEDA PRIVADA)
 * ============================================================================
 * Hola equipo. ¡Esta es la tabla más importante de nuestro MVP Fase 1!
 * Este archivo define cómo se guardan las contraseñas, API Keys y Prompts de IA 
 * en nuestra base de datos.
 * 
 * REGLA DE ORO DEL PROYECTO: En esta tabla está estrictamente prohibido guardar 
 * texto plano. Todo lo que llegue aquí ya debe haber pasado por el servicio de 
 * encriptación y guardarse como un Hash ilegible.
 * 
 * Sigan los TODOs para armar las columnas. Presten atención a la relación con los Entornos.
 * ============================================================================
 */

import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { Environment } from '../environments/environmentEntity';

// Un mismo nombre de llave puede existir en varios entornos, pero no repetirse dentro del mismo.
@Unique('UQ_secrets_key_name_environment', ['keyName', 'environment'])
@Entity('secrets')
export class Secret {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Ej: 'DB_PASSWORD', 'OPENAI_PROMPT_V1'.
    @Column({ name: 'key_name', type: 'varchar', length: 150, nullable: false })
    keyName: string;

    // REGLA DE NEGOCIO: Aquí NUNCA se guarda texto plano, solo el valor generado por EncryptionService.
    @Column({ name: 'encrypted_value', type: 'text', nullable: false })
    encryptedValue: string;

    // Todo secreto DEBE pertenecer a un entorno obligatoriamente.
    // TODO: (Relaciones) Agregar el lado inverso (secret) => secret.environment
    // cuando Environment tenga su @OneToMany 'secrets' implementado.
    @ManyToOne(() => Environment, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'environment_id' })
    environment: Environment;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Vital para saber cuándo fue la última vez que alguien rotó o cambió esta contraseña.
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
