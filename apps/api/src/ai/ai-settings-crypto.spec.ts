import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AISettingsCrypto } from './ai-settings-crypto';

describe('AISettingsCrypto', () => {
  const encryptionKey = Buffer.alloc(32, 7).toString('base64');

  const createCrypto = (key: string) =>
    new AISettingsCrypto({
      get: (name: string) => (name === 'AI_SETTINGS_ENCRYPTION_KEY' ? key : undefined),
    } as ConfigService);

  it('encrypts and decrypts credentials with authenticated encryption', () => {
    const crypto = createCrypto(encryptionKey);
    const encrypted = crypto.encrypt('provider-secret');

    expect(encrypted).not.toContain('provider-secret');
    expect(crypto.decrypt(encrypted)).toBe('provider-secret');
  });

  it('rejects credential writes without a valid encryption key', () => {
    const crypto = createCrypto('');

    expect(crypto.isConfigured()).toBe(false);
    expect(() => crypto.encrypt('provider-secret')).toThrow(ServiceUnavailableException);
  });
});
