import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export const KEY_NAME_MAX_LENGTH = 150;

/**
 * Reglas de un keyName: se normaliza (trim + mayúsculas) y debe tener
 * de 1 a 150 caracteres con solo letras, números o _. Ej: 'DB_PASSWORD'.
 */
export function IsKeyName(): PropertyDecorator {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().toUpperCase() : value,
    ),
    IsString({ message: 'keyName debe ser un texto' }),
    IsNotEmpty({ message: 'keyName es obligatorio' }),
    MaxLength(KEY_NAME_MAX_LENGTH, {
      message: `keyName no puede superar ${KEY_NAME_MAX_LENGTH} caracteres`,
    }),
    Matches(/^[A-Z0-9_]+$/, {
      message: 'keyName solo admite letras, números o _',
    }),
  );
}
