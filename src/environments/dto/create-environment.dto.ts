import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Datos para crear un entorno (POST /environments). */
export class CreateEnvironmentDto {
  // Ej: 'produccion'. El servicio lo guarda en mayúsculas.
  @Transform(trim)
  @IsString({ message: 'name debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'name no puede superar 100 caracteres' })
  name: string;

  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'description debe ser un texto' })
  @MaxLength(255, { message: 'description no puede superar 255 caracteres' })
  description?: string;
}
