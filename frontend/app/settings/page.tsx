'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Save, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/store';

type ApiKeys = {
  openai: string;
  anthropic: string;
  deepseek: string;
  tavily: string;
  ollamaUrl: string;
};

export default function SettingsPage() {
  const { systemPrompt, setSystemPrompt } = useStore();
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: '',
    anthropic: '',
    deepseek: '',
    tavily: '',
    ollamaUrl: 'http://localhost:11434',
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  useEffect(() => {
    // Load saved API keys from localStorage
    const savedKeys = localStorage.getItem('llm-bench-api-keys');
    if (savedKeys) {
      try {
        const parsedKeys = JSON.parse(savedKeys);
        // Merge with default values to ensure all keys are defined
        setApiKeys({
          openai: parsedKeys.openai || '',
          anthropic: parsedKeys.anthropic || '',
          deepseek: parsedKeys.deepseek || '',
          tavily: parsedKeys.tavily || '',
          ollamaUrl: parsedKeys.ollamaUrl || 'http://localhost:11434',
        });
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }

    // Note: System prompt is now loaded from Zustand store which handles persistence
  }, []);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('llm-bench-api-keys', JSON.stringify(apiKeys));
    
    // Also save to backend (if needed)
    // Note: In production, you'd want to encrypt these before sending
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKeys }),
    }).catch(console.error);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return '';
    return key.slice(0, 4) + '...' + key.slice(-4);
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your API keys and application preferences
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Add your API keys to enable different LLM providers. Keys are stored locally in your browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  API keys are stored in your browser&apos;s local storage. For production use, 
                  consider using environment variables or a secure key management service.
                </AlertDescription>
              </Alert>

              {/* OpenAI */}
              <div className="space-y-2">
                <Label htmlFor="openai">OpenAI API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="openai"
                    type={showKeys.openai ? 'text' : 'password'}
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                    placeholder="sk-..."
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowKey('openai')}
                  >
                    {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
                    platform.openai.com
                  </a>
                </p>
              </div>

              {/* Anthropic */}
              <div className="space-y-2">
                <Label htmlFor="anthropic">Anthropic API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="anthropic"
                    type={showKeys.anthropic ? 'text' : 'password'}
                    value={apiKeys.anthropic}
                    onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                    placeholder="sk-ant-..."
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowKey('anthropic')}
                  >
                    {showKeys.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">
                    console.anthropic.com
                  </a>
                </p>
              </div>

              {/* DeepSeek */}
              <div className="space-y-2">
                <Label htmlFor="deepseek">DeepSeek API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="deepseek"
                    type={showKeys.deepseek ? 'text' : 'password'}
                    value={apiKeys.deepseek}
                    onChange={(e) => setApiKeys({ ...apiKeys, deepseek: e.target.value })}
                    placeholder="sk-..."
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowKey('deepseek')}
                  >
                    {showKeys.deepseek ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="underline">
                    platform.deepseek.com
                  </a>
                </p>
              </div>

              {/* Tavily (optional) */}
              <div className="space-y-2">
                <Label htmlFor="tavily">Tavily API Key (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="tavily"
                    type={showKeys.tavily ? 'text' : 'password'}
                    value={apiKeys.tavily}
                    onChange={(e) => setApiKeys({ ...apiKeys, tavily: e.target.value })}
                    placeholder="tvly-..."
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowKey('tavily')}
                  >
                    {showKeys.tavily ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  For web search functionality. Get your key from{' '}
                  <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="underline">
                    tavily.com
                  </a>
                </p>
              </div>

              {/* Ollama URL */}
              <div className="space-y-2">
                <Label htmlFor="ollamaUrl">Ollama URL</Label>
                <Input
                  id="ollamaUrl"
                  type="url"
                  value={apiKeys.ollamaUrl}
                  onChange={(e) => setApiKeys({ ...apiKeys, ollamaUrl: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  URL for your local Ollama instance. Default is http://localhost:11434
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save API Keys
                </Button>
                {saved && (
                  <p className="text-sm text-green-600">Settings saved successfully!</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* API Key Status */}
          <Card>
            <CardHeader>
              <CardTitle>API Key Status</CardTitle>
              <CardDescription>
                Check which providers are configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(apiKeys).map(([provider, key]) => (
                  <div key={provider} className="flex items-center justify-between py-2">
                    <span className="capitalize">{provider}</span>
                    <span className={`text-sm ${key ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {key ? `Configured (${maskKey(key)})` : 'Not configured'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chat Preferences</CardTitle>
              <CardDescription>
                Customize the chat behavior and system prompts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <textarea
                  id="systemPrompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter a system prompt to customize the assistant's behavior..."
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  This prompt will be sent with every message in the chat interface and used 
                  for all prompts during benchmarking. Leave empty to use the model&apos;s default behavior.
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button 
                  onClick={() => {
                    // Zustand store automatically persists to localStorage
                    setPreferencesSaved(true);
                    setTimeout(() => setPreferencesSaved(false), 3000);
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
                {preferencesSaved && (
                  <p className="text-sm text-green-600">Preferences saved successfully!</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Prompt Examples</CardTitle>
              <CardDescription>
                Click to use one of these example prompts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => setSystemPrompt("You are a helpful assistant. Be concise and clear in your responses.")}
              >
                <span className="text-sm">Default Assistant - Clear and concise responses</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => setSystemPrompt("You are an expert programmer. Provide detailed technical explanations and include code examples when relevant.")}
              >
                <span className="text-sm">Technical Expert - Detailed programming help</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => setSystemPrompt("You are a creative writing assistant. Help with storytelling, character development, and narrative structure.")}
              >
                <span className="text-sm">Creative Writer - Storytelling assistance</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => setSystemPrompt("You are a research assistant. Provide well-sourced information and always cite your sources when possible.")}
              >
                <span className="text-sm">Research Assistant - Academic and factual focus</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}