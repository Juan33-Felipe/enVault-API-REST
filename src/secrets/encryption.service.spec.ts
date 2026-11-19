import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

const configWithKey = (key: string | undefined) =>
  ({ get: () => key }) as unknown as ConfigService;

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService(configWithKey('a'.repeat(64)));
  });

  it('decrypt(encrypt(x)) devuelve el texto original, incluso con tildes y emojis', () => {
    for (const text of [
      'hola mundo',
      'contraseña ñandú áéíóú',
      'clave 🔐🚀✨',
    ]) {
      expect(service.decrypt(service.encrypt(text))).toBe(text);
    }
  });

  it('cifrar dos veces el mismo texto da resultados distintos (IV aleatorio)', () => {
    const first = service.encrypt('hola mundo');
    const second = service.encrypt('hola mundo');

    expect(first).not.toBe(second);
    expect(first.split(':')[0]).not.toBe(second.split(':')[0]);
  });

  it('el payload tiene formato iv:authTag:cipherText y no contiene el texto original', () => {
    const plainText = 'superSecreta123';
    const payload = service.encrypt(plainText);
    const [iv, authTag] = payload.split(':');

    expect(payload.split(':')).toHaveLength(3);
    expect(Buffer.from(iv, 'base64')).toHaveLength(12);
    expect(Buffer.from(authTag, 'base64')).toHaveLength(16);
    expect(payload).not.toContain(plainText);
    expect(payload).not.toContain(Buffer.from(plainText).toString('base64'));
  });

  it('alterar un carácter del payload hace que decrypt lance un error', () => {
    const payload = service.encrypt('hola mundo');
    const [iv, authTag, cipherText] = payload.split(':');
    const tampered = `${iv}:${authTag}:${cipherText[0] === 'A' ? 'B' : 'A'}${cipherText.slice(1)}`;

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('decrypt lanza un error si el formato no tiene 3 partes', () => {
    expect(() => service.decrypt('sin-separadores')).toThrow(
      'Formato de secreto cifrado inválido',
    );
  });

  it('el constructor lanza un error si la clave no mide 32 bytes o no existe', () => {
    const message =
      'ENCRYPTION_MASTER_KEY debe tener 64 caracteres hex (32 bytes)';

    expect(() => new EncryptionService(configWithKey('a'.repeat(62)))).toThrow(
      message,
    );
    expect(() => new EncryptionService(configWithKey(undefined))).toThrow(
      message,
    );
  });
});
