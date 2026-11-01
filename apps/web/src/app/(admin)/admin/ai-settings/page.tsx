'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface ProviderOption {
  id: string;
  label: string;
  model: string;
  baseUrl: string;
  apiKeyConfigured: boolean;
}

interface AISettings {
  activeProvider: string;
  activeModel: string;
  baseUrl: string;
  encryptionKeyConfigured: boolean;
  providers: ProviderOption[];
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 12px',
  background: 'var(--surface)',
  color: 'var(--text-1)',
  fontSize: 14,
};

export default function AdminAISettingsPage() {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const result = await apiClient.get<AISettings>('/admin/ai-settings', token);
      setSettings(result);
      setProvider(result.activeProvider);
      setModel(result.activeModel);
      setBaseUrl(result.baseUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load AI settings.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectProvider = (id: string) => {
    const selected = settings?.providers.find((item) => item.id === id);
    if (!selected) return;
    setProvider(id);
    setModel(selected.model);
    setBaseUrl(selected.baseUrl);
    setApiKey('');
  };

  const save = async () => {
    const token = await getToken();
    if (!token) return toast.error('Please sign in again.');
    setSaving(true);
    try {
      const updated = await apiClient.post<AISettings>(
        '/admin/ai-settings',
        {
          provider,
          model: model.trim(),
          baseUrl: baseUrl.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
        },
        token,
      );
      setSettings(updated);
      setProvider(updated.activeProvider);
      setModel(updated.activeModel);
      setBaseUrl(updated.baseUrl);
      setApiKey('');
      toast.success('AI provider/model saved and activated for all users.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save AI settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card hoverEffect={false}>Loading AI settings…</Card>;
  if (!settings)
    return <Card hoverEffect={false}>AI settings could not be loaded. Refresh to try again.</Card>;

  const selected = settings.providers.find((item) => item.id === provider);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 20 }}>
      <header>
        <h1 style={{ color: 'var(--text-1)', margin: 0 }}>AI provider settings</h1>
        <p style={{ color: 'var(--text-2)' }}>
          The active provider and model are shared by all users and AI features. Choose a provider,
          model ID, and its key.
        </p>
      </header>

      {!settings.encryptionKeyConfigured && (
        <Card hoverEffect={false} style={{ border: '1px solid #f59e0b' }}>
          <strong style={{ color: 'var(--text-1)' }}>Secure key storage needs setup</strong>
          <p style={{ color: 'var(--text-2)', marginBottom: 0 }}>
            Before saving provider keys, set <code>AI_SETTINGS_ENCRYPTION_KEY</code> in the API
            environment to a stable 32-byte base64 or 64-character hex key, then restart the
            service. Saved provider keys are encrypted and never shown again.
          </p>
        </Card>
      )}

      <Card hoverEffect={false} style={{ display: 'grid', gap: 16 }}>
        <label
          style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 13, fontWeight: 700 }}
        >
          AI provider
          <select
            style={inputStyle}
            value={provider}
            onChange={(event) => selectProvider(event.target.value)}
          >
            {settings.providers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label
          style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 13, fontWeight: 700 }}
        >
          Model ID
          <input
            style={inputStyle}
            required
            maxLength={120}
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="Model identifier from your provider"
          />
        </label>
        {provider !== 'GEMINI' && (
          <label
            style={{
              display: 'grid',
              gap: 6,
              color: 'var(--text-2)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            API base URL
            <input
              style={inputStyle}
              type="url"
              maxLength={500}
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={
                provider === 'OLLAMA' ? 'https://your-hosted-ollama.example/v1' : selected?.baseUrl
              }
            />
            {provider === 'OLLAMA' && (
              <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>
                Use a hosted endpoint reachable from Render, usually ending in /v1. A URL on your
                computer will not be reachable by the production API.
              </span>
            )}
          </label>
        )}
        {provider !== 'OLLAMA' && (
          <label
            style={{
              display: 'grid',
              gap: 6,
              color: 'var(--text-2)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            API key
            <input
              style={inputStyle}
              type="password"
              autoComplete="new-password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={
                selected?.apiKeyConfigured
                  ? 'Key saved; leave blank to keep it'
                  : 'Enter provider API key'
              }
            />
            <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>
              Keys are encrypted on the server and masked in this panel. Never paste a key into chat
              or a public issue.
            </span>
          </label>
        )}
        {provider === 'OLLAMA' && (
          <label
            style={{
              display: 'grid',
              gap: 6,
              color: 'var(--text-2)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            API key (if required by your hosted server)
            <input
              style={inputStyle}
              type="password"
              autoComplete="new-password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={
                selected?.apiKeyConfigured
                  ? 'Key saved; leave blank to keep it'
                  : 'Optional for many self-hosted servers'
              }
            />
          </label>
        )}
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
          Active now:{' '}
          <strong style={{ color: 'var(--text-2)' }}>
            {settings.providers.find((item) => item.id === settings.activeProvider)?.label ??
              settings.activeProvider}{' '}
            · {settings.activeModel}
          </strong>
        </div>
        <Button
          disabled={
            saving || !model.trim() || (!settings.encryptionKeyConfigured && Boolean(apiKey.trim()))
          }
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save and activate for everyone'}
        </Button>
      </Card>
      <p style={{ color: 'var(--text-3)', fontSize: 12, margin: 0 }}>
        Supported adapters: Gemini, OpenAI-compatible APIs (OpenAI, DeepSeek, Groq, NVIDIA NIM,
        and compatible Ollama hosts), and Anthropic Claude. OpenAI API billing is separate from a
        ChatGPT subscription.
      </p>
    </div>
  );
}
