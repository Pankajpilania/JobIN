import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AISettingsCrypto } from './ai-settings-crypto';
import { AIService } from './ai.service';

describe('AIService provider routing', () => {
  const encryptionKey = Buffer.alloc(32, 3).toString('base64');
  const config = {
    get: (name: string) => (name === 'AI_SETTINGS_ENCRYPTION_KEY' ? encryptionKey : undefined),
  } as ConfigService;

  it('sends requests to the active OpenAI-compatible provider using the encrypted credential', async () => {
    const crypto = new AISettingsCrypto(config);
    const prisma = {
      aIPlatformSettings: {
        findUnique: jest.fn().mockResolvedValue({
          activeProvider: 'OPENAI',
          activeModel: 'gpt-test',
          baseUrl: null,
        }),
      },
      aIProviderCredential: {
        findUnique: jest.fn().mockResolvedValue({
          encryptedApiKey: crypto.encrypt('test-provider-key'),
        }),
      },
    } as unknown as PrismaService;
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  healthScore: 80,
                  summary: 'Clear and relevant.',
                  formattingIssues: [],
                  keywordSuggestions: [],
                  missingSections: [],
                  strengths: ['Relevant experience'],
                  improvements: [],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 25, completion_tokens: 15 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    try {
      const service = new AIService(config, prisma, crypto);
      const result = await service.analyseResume('Candidate resume');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-provider-key' }),
        }),
      );
      expect(result.result.healthScore).toBe(80);
      expect(result.usage.modelName).toBe('gpt-test');
      expect(result.usage.totalTokens).toBe(40);
    } finally {
      fetchMock.mockRestore();
    }
  });
});
