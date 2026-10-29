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

import { Entity } from 'typeorm';

// TODO: Importar PrimaryGeneratedColumn, Column, CreateDateColumn y OneToMany de 'typeorm'

@Entity('environments')
export class Environment {
    // TODO: Crear columna 'id' como PrimaryGeneratedColumn tipo 'uuid'.

    // TODO: Crear columna 'name'. Debe ser tipo string, única (unique: true) y no nula. 
    // Ej: 'PRODUCCION', 'DESARROLLO', 'QA'.

    // TODO: Crear columna 'description'. Debe ser tipo string y opcional (nullable: true).

    // TODO: (Opcional - Relaciones) Crear decorador @OneToMany apuntando a la entidad Secret.
    // Esto servirá para saber cuántos secretos le pertenecen a este entorno.

    // TODO: Crear columna 'createdAt' usando el decorador @CreateDateColumn() para auditoría básica.
}