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

import { Entity } from 'typeorm';

// TODO: Importar PrimaryGeneratedColumn, Column y CreateDateColumn de 'typeorm'

@Entity('audit_logs')
export class AuditLog {
    // TODO: Crear columna 'id' como PrimaryGeneratedColumn tipo 'uuid'.

    // TODO: Crear columna 'action'. Debe ser string y no nula.
    // Ej: 'CREATE_SECRET', 'READ_SECRET', 'UPDATE_SECRET', 'DELETE_ENVIRONMENT'.

    // TODO: Crear columna 'actor'. Debe ser string y no nula.
    // Representa quién hizo la acción (Ej: 'backend_ventas_prod' o 'admin_felipe').

    // TODO: Crear columna 'target'. Debe ser string y opcional.
    // Representa qué recurso fue afectado (Ej: el nombre de la llave que se intentó leer).

    // TODO: Crear columna 'status'. Debe ser string.
    // Solo debe aceptar 'SUCCESS' o 'FAILED' (Recomendable usar un enum de TypeScript).

    // TODO: Crear columna 'ipAddress'. Debe ser string y opcional.
    // Para rastrear desde qué dirección de red se hizo la petición a la API.

    // TODO: Crear columna 'timestamp' usando @CreateDateColumn().
    // Es el dato más crítico de la caja negra: el instante exacto en que ocurrió el evento.
}