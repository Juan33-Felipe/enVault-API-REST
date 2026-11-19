import { IsKeyName } from './key-name.decorator';

/** Valida el parámetro :keyName de la URL. */
export class KeyNameParamDto {
  @IsKeyName()
  keyName: string;
}
