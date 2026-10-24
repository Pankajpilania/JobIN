import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class AISettingsCrypto {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const value = this.config.get<string>('AI_SETTINGS_ENCRYPTION_KEY') ?? '';
    const key = /^[\da-f]{64}$/i.test(value)
      ? Buffer.from(value, 'hex')
      : Buffer.from(value, 'base64');
    return key.length === 32;
  }

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(value: string): string {
    const [version, encodedIv, encodedTag, encodedData] = value.split(':');
    if (version !== 'v1' || !encodedIv || !encodedTag || !encodedData) {
      throw new Error('Stored AI credential has an unsupported encrypted format.');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getEncryptionKey(),
      Buffer.from(encodedIv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encodedData, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private getEncryptionKey(): Buffer {
    const value = this.config.get<string>('AI_SETTINGS_ENCRYPTION_KEY') ?? '';
    const key = /^[\da-f]{64}$/i.test(value)
      ? Buffer.from(value, 'hex')
      : Buffer.from(value, 'base64');
    if (key.length !== 32) {
      throw new ServiceUnavailableException(
        'AI key storage is not configured. Set AI_SETTINGS_ENCRYPTION_KEY to a 32-byte base64 or 64-character hex key in the API environment.',
      );
    }
    return key;
  }
}
