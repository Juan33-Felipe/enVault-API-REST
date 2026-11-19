import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateSecretDto } from './create-secret.dto';
import { KeyNameParamDto } from './key-name-param.dto';
import { UpdateSecretDto } from './update-secret.dto';

// Mismas opciones que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const body = (metatype: new () => object, value: unknown) =>
  pipe.transform(value, { type: 'body', metatype });
const param = (value: unknown) =>
  pipe.transform(value, { type: 'param', metatype: KeyNameParamDto });

describe('DTOs de secretos', () => {
  describe('CreateSecretDto', () => {
    it('normaliza keyName a mayúsculas sin espacios', async () => {
      await expect(
        body(CreateSecretDto, { keyName: ' db_password ', value: 's3cr3t' }),
      ).resolves.toEqual({ keyName: 'DB_PASSWORD', value: 's3cr3t' });
    });

    it('no modifica el value', async () => {
      const result = await body(CreateSecretDto, {
        keyName: 'TOKEN',
        value: '  con espacios ',
      });
      expect(result).toMatchObject({ value: '  con espacios ' });
    });

    it.each([
      ['sin keyName', { value: 'x' }],
      ['keyName con guiones', { keyName: 'db-password', value: 'x' }],
      ['keyName con espacios internos', { keyName: 'DB PASS', value: 'x' }],
      ['keyName de más de 150', { keyName: 'A'.repeat(151), value: 'x' }],
      ['keyName que no es texto', { keyName: 42, value: 'x' }],
      ['sin value', { keyName: 'TOKEN' }],
      ['value vacío', { keyName: 'TOKEN', value: '' }],
      ['value que no es texto', { keyName: 'TOKEN', value: { a: 1 } }],
      [
        'campos extra (environment)',
        { keyName: 'T', value: 'x', environment: 'otro' },
      ],
    ])('%s → 400', async (_caso, value) => {
      await expect(body(CreateSecretDto, value)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('el mensaje de error no incluye el valor del secreto', async () => {
      const error = await body(CreateSecretDto, {
        keyName: 'mal-nombre',
        value: 'superSecreta123',
      }).catch((e: BadRequestException) => e);

      expect(JSON.stringify(error.getResponse())).not.toContain(
        'superSecreta123',
      );
    });
  });

  describe('UpdateSecretDto', () => {
    it('acepta un value válido', async () => {
      await expect(body(UpdateSecretDto, { value: 'nueva' })).resolves.toEqual({
        value: 'nueva',
      });
    });

    it.each([
      ['sin value', {}],
      ['value vacío', { value: '' }],
      ['intentar cambiar keyName', { value: 'x', keyName: 'OTRO' }],
    ])('%s → 400', async (_caso, value) => {
      await expect(body(UpdateSecretDto, value)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('KeyNameParamDto', () => {
    it('normaliza el :keyName de la URL', async () => {
      await expect(param({ keyName: 'db_password' })).resolves.toEqual({
        keyName: 'DB_PASSWORD',
      });
    });

    it('rechaza un :keyName inválido', async () => {
      await expect(param({ keyName: 'no-valido' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
