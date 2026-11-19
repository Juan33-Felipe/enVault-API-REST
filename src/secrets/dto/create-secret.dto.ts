import { IsNotEmpty, IsString } from 'class-validator';
import { IsKeyName } from './key-name.decorator';

/** Datos para guardar un secreto (POST /secrets). */
export class CreateSecretDto {
  @IsKeyName()
  keyName: string;

  // El valor nunca se registra: solo se cifra y se guarda.
  @IsString({ message: 'value debe ser un texto' })
  @IsNotEmpty({ message: 'value es obligatorio' })
  value: string;
}
