import { IsNotEmpty, IsString } from 'class-validator';

/** Nuevo valor para rotar un secreto (PUT /secrets/:keyName). */
export class UpdateSecretDto {
  @IsString({ message: 'value debe ser un texto' })
  @IsNotEmpty({ message: 'value es obligatorio' })
  value: string;
}
