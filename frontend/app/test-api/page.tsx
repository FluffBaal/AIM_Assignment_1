'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useModels } from '@/hooks/useModels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type Provider = 'openai' | 'anthropic' | 'deepseek' | 'ollama';

type TestResult = {
  provider: string;
  model: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  response?: string;
  error?: string;
  time?: number;
};

export default function TestAPIPage() {
  const { apiKeys } = useApiKeys();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Multi-model test state
  const [prompt, setPrompt] = useState('Tell me a joke about programming');
  const [selectedModels, setSelectedModels] = useState<{ provider: Provider; model: string }[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testingAll, setTestingAll] = useState(false);
  
  // Get models for each provider
  const openaiModels = useModels('openai');
  const anthropicModels = useModels('anthropic');
  const deepseekModels = useModels('deepseek');
  const ollamaModels = useModels('ollama');

  const testOpenAI = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/test-openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-API-Key': apiKeys.openai || '',
        },
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testModels = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/models/openai', {
        method: 'GET',
        headers: {
          'X-OpenAI-API-Key': apiKeys.openai || '',
        },
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const addModel = (provider: Provider, modelId: string) => {
    const exists = selectedModels.some(m => m.provider === provider && m.model === modelId);
    if (!exists) {
      setSelectedModels([...selectedModels, { provider, model: modelId }]);
    }
  };

  const removeModel = (provider: Provider, modelId: string) => {
    setSelectedModels(selectedModels.filter(m => !(m.provider === provider && m.model === modelId)));
  };

  const testAllModels = async () => {
    if (selectedModels.length === 0 || !prompt.trim()) return;
    
    setTestingAll(true);
    const results: TestResult[] = selectedModels.map(({ provider, model }) => ({
      provider,
      model,
      status: 'pending',
    }));
    setTestResults(results);

    for (let i = 0; i < selectedModels.length; i++) {
      const { provider, model } = selectedModels[i];
      
      // Update status to loading
      setTestResults(prev => 
        prev.map((r, idx) => idx === i ? { ...r, status: 'loading' } : r)
      );

      const startTime = Date.now();
      
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add appropriate API keys
        if (provider === 'openai' && apiKeys.openai) headers['X-OpenAI-API-Key'] = apiKeys.openai;
        if (provider === 'anthropic' && apiKeys.anthropic) headers['X-Anthropic-API-Key'] = apiKeys.anthropic;
        if (provider === 'deepseek' && apiKeys.deepseek) headers['X-DeepSeek-API-Key'] = apiKeys.deepseek;
        if (provider === 'ollama' && apiKeys.ollamaUrl) headers['X-Ollama-URL'] = apiKeys.ollamaUrl;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model,
            provider,
            stream: false,
          }),
        });

        const data = await response.json();
        const endTime = Date.now();

        if (response.ok) {
          setTestResults(prev =>
            prev.map((r, idx) => 
              idx === i 
                ? { 
                    ...r, 
                    status: 'success', 
                    response: data.choices?.[0]?.message?.content || 'No content',
                    time: endTime - startTime
                  } 
                : r
            )
          );
        } else {
          setTestResults(prev =>
            prev.map((r, idx) => 
              idx === i 
                ? { 
                    ...r, 
                    status: 'error', 
                    error: data.detail || 'Unknown error',
                    time: endTime - startTime
                  } 
                : r
            )
          );
        }
      } catch (error) {
        const endTime = Date.now();
        setTestResults(prev =>
          prev.map((r, idx) => 
            idx === i 
              ? { 
                  ...r, 
                  status: 'error', 
                  error: String(error),
                  time: endTime - startTime
                } 
              : r
          )
        );
      }
    }

    setTestingAll(false);
  };

  const allProviders = [
    { id: 'openai', name: 'OpenAI', models: openaiModels },
    { id: 'anthropic', name: 'Anthropic', models: anthropicModels },
    { id: 'deepseek', name: 'DeepSeek', models: deepseekModels },
    { id: 'ollama', name: 'Ollama', models: ollamaModels },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">API Test Page</h1>
      
      <Tabs defaultValue="single" className="w-full">
        <TabsList>
          <TabsTrigger value="single">Single API Test</TabsTrigger>
          <TabsTrigger value="multi">Test All Models</TabsTrigger>
        </TabsList>
        
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Single API Test</CardTitle>
              <CardDescription>Test individual API endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Current API Key: {apiKeys.openai ? `${apiKeys.openai.substring(0, 7)}...${apiKeys.openai.slice(-4)}` : 'Not set'}
                </p>
              </div>

              <div className="space-x-2">
                <Button onClick={testOpenAI} disabled={loading || !apiKeys.openai}>
                  Test OpenAI Direct
                </Button>
                <Button onClick={testModels} disabled={loading || !apiKeys.openai}>
                  Test List Models
                </Button>
              </div>

              {loading && <p>Loading...</p>}
              
              {result && (
                <div className="bg-muted p-4 rounded-lg">
                  <h2 className="font-semibold mb-2">Result:</h2>
                  <pre className="whitespace-pre-wrap overflow-auto text-sm">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="multi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test All Models</CardTitle>
              <CardDescription>Send the same prompt to multiple models and compare responses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Test Prompt</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a prompt to test across models..."
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <Label>Select Models to Test</Label>
                {allProviders.map(({ id, name, models }) => (
                  <div key={id} className="space-y-2">
                    <h4 className="text-sm font-medium">{name}</h4>
                    {models.loading ? (
                      <p className="text-sm text-muted-foreground">Loading models...</p>
                    ) : models.error ? (
                      <p className="text-sm text-destructive">Error: {models.error}</p>
                    ) : models.models.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No models available</p>
                    ) : (
                      <Select onValueChange={(value) => addModel(id as Provider, value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`Select ${name} model`} />
                        </SelectTrigger>
                        <SelectContent>
                          {models.models.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>

              {selectedModels.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Models</Label>
                  <div className="space-y-1">
                    {selectedModels.map(({ provider, model }) => (
                      <div key={`${provider}-${model}`} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="text-sm">{provider}: {model}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeModel(provider, model)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={testAllModels} 
                disabled={testingAll || selectedModels.length === 0 || !prompt.trim()}
                className="w-full"
              >
                {testingAll ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing Models...
                  </>
                ) : (
                  `Test ${selectedModels.length} Model${selectedModels.length !== 1 ? 's' : ''}`
                )}
              </Button>

              {testResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Test Results</h3>
                  {testResults.map((result, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {result.provider}: {result.model}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            {result.time && (
                              <span className="text-sm text-muted-foreground">
                                {result.time}ms
                              </span>
                            )}
                            {result.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                            {result.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            {result.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {result.status === 'loading' && (
                          <p className="text-sm text-muted-foreground">Testing...</p>
                        )}
                        {result.status === 'success' && result.response && (
                          <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                            {result.response}
                          </div>
                        )}
                        {result.status === 'error' && result.error && (
                          <Alert variant="destructive">
                            <AlertDescription>{result.error}</AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}