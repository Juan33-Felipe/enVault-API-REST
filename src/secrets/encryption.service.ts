import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Cifra y descifra los valores de los secretos con AES-256-GCM.
 * Formato del payload (fijo, no cambiar): `iv:authTag:cipherText` en base64.
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const hex = config.get<string>('ENCRYPTION_MASTER_KEY');
    const key = hex ? Buffer.from(hex, 'hex') : Buffer.alloc(0);

    if (key.length !== 32) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY debe tener 64 caracteres hex (32 bytes)',
      );
    }

    this.key = key;
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de secreto cifrado inválido');
    }

    const [iv, authTag, encrypted] = parts.map((part) =>
      Buffer.from(part, 'base64'),
    );

    const decipher = createDecipheriv(this.algorithm, this.key, iv, {
      authTagLength: 16,
    });
    decipher.setAuthTag(authTag);

    // Si el dato fue alterado o la clave es otra, final() lanza un error.
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}
