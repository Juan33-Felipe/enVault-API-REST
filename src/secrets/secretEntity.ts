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

import { Entity } from 'typeorm';

// TODO: Importar PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn y ManyToOne de 'typeorm'
// TODO: Importar la clase Environment del archivo environment.entity.ts

@Entity('secrets')
export class Secret {
    // TODO: Crear columna 'id' como PrimaryGeneratedColumn tipo 'uuid'.

    // TODO: Crear columna 'keyName'. Debe ser string y no nula.
    // Representa el nombre de la variable (Ej: 'DB_PASSWORD', 'OPENAI_PROMPT_V1').

    // TODO: Crear columna 'encryptedValue'. Debe ser string (o text para cadenas muy largas) y no nula.
    // REGLA DE NEGOCIO: Aquí NUNCA se guarda texto plano, solo el hash generado por EncryptionService.

    // TODO: Crear relación 'environment' usando el decorador @ManyToOne apuntando a la entidad Environment.
    // Todo secreto DEBE pertenecer a un entorno obligatoriamente.

    // TODO: Crear columna 'createdAt' usando @CreateDateColumn().

    // TODO: Crear columna 'updatedAt' usando @UpdateDateColumn(). 
    // Vital para saber cuándo fue la última vez que alguien rotó o cambió esta contraseña.
}