import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService admin content escaping', () => {
  it('escapes campaign content and subject before rendering HTML', async () => {
    const values: Record<string, string> = {
      RESEND_API_KEY: 're_test',
      NEXT_PUBLIC_URL: 'https://jobin.today',
    };
    const config = {
      get: jest.fn((key: string) => values[key]),
    };
    const service = new EmailService(config as unknown as ConfigService);
    const send = jest.spyOn(service['resend'].emails, 'send').mockResolvedValue({
      data: { id: 'email-id' },
      error: null,
    } as any);

    await service.sendCampaign(
      'user@example.com',
      '<img src=x>',
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
    );

    const html = send.mock.calls[0][0].html;
    expect(html).toContain('Hi &lt;img src=x&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });
});
