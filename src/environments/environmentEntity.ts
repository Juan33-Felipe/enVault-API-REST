/**
 * ============================================================================
 * 🌍 ENTIDAD: ENVIRONMENTS (LOS ENTORNOS)
 * ============================================================================
 * Hola equipo. Este archivo representa la tabla de Entornos en nuestra base de datos.
 * Su propósito principal es mantener el orden y el aislamiento en nuestra API.
 * 
 * Aquí vamos a definir las "secciones" de nuestra biblioteca (Ej: Desarrollo, 
 * Pruebas, Producción). Es vital porque nos asegurará que una llave de pruebas 
 * nunca se mezcle con una llave de los clientes reales.
 * 
 * Sigan los TODOs a continuación para construir la estructura de la tabla con TypeORM.
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

    // TODO: (Relaciones) Agregar @OneToMany(() => Secret, (secret) => secret.environment)
    // cuando la entidad Secret tenga su @ManyToOne 'environment' implementado.

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
