'use client';

import { useState, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, Play, AlertCircle, FileJson, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useStore } from '@/store';
import { useModels } from '@/hooks/useModels';
import { useApiKeys } from '@/hooks/useApiKeys';

export default function TestsetPage() {
  const {
    testsetContent,
    setTestsetContent,
    aiConfig,
    updateAiConfig,
    aiGenerationOpen,
    setAiGenerationOpen,
  } = useStore();
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const { apiKeys } = useApiKeys();
  const { models } = useModels(aiConfig.provider);
  
  // Available providers based on API keys
  const availableProviders = [
    { value: 'openai', label: 'OpenAI', hasKey: !!apiKeys.openai && apiKeys.openai !== 'empty' },
    { value: 'anthropic', label: 'Anthropic', hasKey: !!apiKeys.anthropic && apiKeys.anthropic !== 'empty' },
    { value: 'deepseek', label: 'DeepSeek', hasKey: !!apiKeys.deepseek && apiKeys.deepseek !== 'empty' },
    { value: 'ollama', label: 'Ollama', hasKey: !!apiKeys.ollamaUrl && apiKeys.ollamaUrl !== 'empty' },
  ].filter(p => p.hasKey);

  // Set initial model when models are loaded
  useEffect(() => {
    if (models.length > 0 && !models.find(m => m.id === aiConfig.model)) {
      // Current model not in list, select first available
      updateAiConfig({ model: models[0].id });
    }
  }, [models, aiConfig.model, updateAiConfig]);

  // Set initial provider if none selected
  useEffect(() => {
    if (!aiConfig.provider && availableProviders.length > 0) {
      updateAiConfig({ provider: availableProviders[0].value });
    }
  }, [availableProviders, aiConfig.provider, updateAiConfig]);

  const validateJSONL = (text: string): boolean => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return false;

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (!obj.id || !obj.content) {
          setError(`Invalid format: Each line must have "id" and "content" fields`);
          return false;
        }
      } catch (e) {
        setError(`Invalid JSON on line: ${line.substring(0, 50)}...`);
        return false;
      }
    }
    return true;
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setTestsetContent(text);
      setSuccess('File imported successfully');
      setTimeout(() => setSuccess(null), 3000);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExport = () => {
    const blob = new Blob([testsetContent], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testset-${Date.now()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { setCustomTestsetData, setBenchmarkName, setBenchmarkPrompts } = useStore();
  
  const handleRunBenchmark = () => {
    setError(null);
    
    if (!validateJSONL(testsetContent)) {
      return;
    }

    // Parse testset and prepare prompts
    const lines = testsetContent.trim().split('\n');
    const promptTexts = lines.map(line => {
      try {
        const obj = JSON.parse(line);
        return obj.content;
      } catch {
        return null;
      }
    }).filter(Boolean).join('\n');
    
    // Store testset data in the store
    setCustomTestsetData(testsetContent);
    setBenchmarkPrompts(promptTexts);
    setBenchmarkName('Custom Test Set');
    
    router.push('/benchmark?testset=custom');
  };

  const loadStarterTestset = async () => {
    try {
      const response = await fetch('/starter-testset.jsonl');
      const text = await response.text();
      setTestsetContent(text);
      setSuccess('Loaded starter testset with 20 questions');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to load starter testset');
    }
  };

  const handleAiGenerate = async () => {
    if (!aiConfig.topic.trim()) {
      setError('Please enter a topic for test generation');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // API keys are already available from the hook

      const response = await fetch('/api/generate-testset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKeys.openai && { 'X-OpenAI-API-Key': apiKeys.openai }),
          ...(apiKeys.anthropic && { 'X-Anthropic-API-Key': apiKeys.anthropic }),
          ...(apiKeys.deepseek && { 'X-DeepSeek-API-Key': apiKeys.deepseek }),
          ...(apiKeys.ollamaUrl && { 'X-Ollama-URL': apiKeys.ollamaUrl }),
        },
        body: JSON.stringify({
          topic: aiConfig.topic,
          numQuestions: aiConfig.numQuestions,
          difficulty: aiConfig.difficulty,
          categories: aiConfig.categories || null,
          customInstructions: aiConfig.customInstructions || null,
          provider: aiConfig.provider,
          model: aiConfig.model,
          testFormatOutput: aiConfig.testFormatOutput,
          outputFormat: aiConfig.testFormatOutput ? (aiConfig.outputFormat === 'other' ? aiConfig.customOutputFormat : aiConfig.outputFormat) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          throw new Error('No API key configured. Please add an OpenAI or Anthropic API key in Settings.');
        }
        throw new Error(errorData.detail || `Failed to generate: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Parse the generated content and insert into editor
      if (data.testset) {
        // Simply replace the entire content with the generated questions
        const newLines = data.testset.trim().split('\n').filter((line: string) => line.trim());
        
        // Validate and clean up the generated content
        const validLines = newLines.map((line: string) => {
          try {
            const obj = JSON.parse(line);
            return JSON.stringify(obj);
          } catch {
            return null;
          }
        }).filter(Boolean);

        const newContent = validLines.join('\n');
        setTestsetContent(newContent);
        setSuccess(`Generated ${validLines.length} test questions`);
        setTimeout(() => setSuccess(null), 3000);
        setAiGenerationOpen(false);
        
        // Reset form (keep provider and model)
        updateAiConfig({
          topic: '',
          numQuestions: 5,
          difficulty: 'mixed',
          categories: '',
          customInstructions: '',
          provider: aiConfig.provider,
          model: aiConfig.model
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate test questions');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Test Set Editor</h1>
        <p className="text-muted-foreground mt-2">
          Create and edit JSONL test sets for benchmarking
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>JSONL Editor</CardTitle>
            <CardDescription>
              Each line should be a valid JSON object with at least &quot;id&quot; and &quot;content&quot; fields.
              Optional fields: &quot;expected_answer&quot;, &quot;category&quot;, &quot;difficulty&quot;, &quot;metadata&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button
                  onClick={handleExport}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={loadStarterTestset}
                  variant="outline"
                  size="sm"
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Load Starter Set
                </Button>
                
                <Sheet open={aiGenerationOpen} onOpenChange={setAiGenerationOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate with AI
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader className="px-6">
                      <SheetTitle>Generate Test Questions with AI</SheetTitle>
                      <SheetDescription>
                        Configure parameters for AI-generated test questions
                      </SheetDescription>
                    </SheetHeader>
                    
                    <div className="px-6 py-6 space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="topic">Topic/Domain *</Label>
                        <Input
                          id="topic"
                          placeholder="e.g., Python programming, Machine Learning, History"
                          value={aiConfig.topic}
                          onChange={(e) => updateAiConfig({ topic: e.target.value })}
                          className="w-full"
                        />
                      </div>
                      
                      {availableProviders.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No API keys configured. Please add API keys in Settings to use AI generation.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="provider">AI Provider</Label>
                            <Select
                              value={aiConfig.provider}
                              onValueChange={(value) => {
                                updateAiConfig({ provider: value });
                                // Model will be updated by the useEffect
                              }}
                            >
                              <SelectTrigger id="provider" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableProviders.map((provider) => (
                                  <SelectItem key={provider.value} value={provider.value}>
                                    {provider.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {models.length > 0 ? (
                            <div className="space-y-2">
                              <Label htmlFor="model">Model</Label>
                              <Select
                                value={aiConfig.model}
                                onValueChange={(value) => updateAiConfig({ model: value })}
                              >
                                <SelectTrigger id="model" className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {models.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                      {model.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <Alert className="border-amber-500/50 text-amber-600 dark:border-amber-500/30 dark:text-amber-400">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                No models available. Please enter your {aiConfig.provider === 'openai' ? 'OpenAI' : aiConfig.provider === 'anthropic' ? 'Anthropic' : aiConfig.provider === 'deepseek' ? 'DeepSeek' : 'Ollama'} API key in{' '}
                                <Link href="/settings" className="underline font-medium">
                                  Settings
                                </Link>
                              </AlertDescription>
                            </Alert>
                          )}
                        </>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="numQuestions">Number of Questions</Label>
                        <Input
                          id="numQuestions"
                          type="number"
                          min="1"
                          max="50"
                          value={aiConfig.numQuestions}
                          onChange={(e) => updateAiConfig({ numQuestions: parseInt(e.target.value) || 5 })}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="difficulty">Difficulty Level</Label>
                        <Select
                          value={aiConfig.difficulty}
                          onValueChange={(value) => updateAiConfig({ difficulty: value })}
                        >
                          <SelectTrigger id="difficulty" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                            <SelectItem value="mixed">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="categories">Categories (optional)</Label>
                        <Input
                          id="categories"
                          placeholder="e.g., basics, advanced, theory, practice"
                          value={aiConfig.categories}
                          onChange={(e) => updateAiConfig({ categories: e.target.value })}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Comma-separated list of categories to include
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label htmlFor="testFormatOutput">Test for Formatted Output</Label>
                            <p className="text-xs text-muted-foreground">
                              Generate questions that require specific output formats (JSON, CSV, etc.)
                            </p>
                          </div>
                          <Switch
                            id="testFormatOutput"
                            checked={aiConfig.testFormatOutput}
                            onCheckedChange={(checked) => updateAiConfig({ testFormatOutput: checked })}
                          />
                        </div>
                      </div>
                      
                      {aiConfig.testFormatOutput && (
                        <div className="space-y-2">
                          <Label htmlFor="outputFormat">Output Format</Label>
                          <Select
                            value={aiConfig.outputFormat}
                            onValueChange={(value) => updateAiConfig({ outputFormat: value })}
                          >
                            <SelectTrigger id="outputFormat" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="json">JSON</SelectItem>
                              <SelectItem value="csv">CSV</SelectItem>
                              <SelectItem value="xml">XML</SelectItem>
                              <SelectItem value="yaml">YAML</SelectItem>
                              <SelectItem value="markdown">Markdown Table</SelectItem>
                              <SelectItem value="list">Bullet List</SelectItem>
                              <SelectItem value="numbered">Numbered List</SelectItem>
                              <SelectItem value="sql">SQL Query</SelectItem>
                              <SelectItem value="code">Code Snippet</SelectItem>
                              <SelectItem value="other">Other (Custom)</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {aiConfig.outputFormat === 'other' && (
                            <Input
                              placeholder="Specify custom format (e.g., 'HTML table', 'LaTeX equation')"
                              value={aiConfig.customOutputFormat || ''}
                              onChange={(e) => updateAiConfig({ customOutputFormat: e.target.value })}
                              className="w-full mt-2"
                            />
                          )}
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="instructions">Custom Instructions (optional)</Label>
                        <Textarea
                          id="instructions"
                          placeholder="Any specific requirements or style for the questions..."
                          value={aiConfig.customInstructions}
                          onChange={(e) => updateAiConfig({ customInstructions: e.target.value })}
                          rows={3}
                          className="w-full min-h-[80px]"
                        />
                      </div>
                    </div>
                    
                    <SheetFooter className="px-6 pb-6">
                      <Button
                        onClick={handleAiGenerate}
                        disabled={generating || !aiConfig.topic.trim() || availableProviders.length === 0}
                        className="w-full"
                      >
                        {generating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Questions
                          </>
                        )}
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
                
                <Button
                  onClick={handleRunBenchmark}
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Run Benchmark
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jsonl,.ndjson,.json"
                onChange={handleImport}
                className="hidden"
              />

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg overflow-hidden">
                <CodeMirror
                  value={testsetContent}
                  height="500px"
                  theme={oneDark}
                  extensions={[json()]}
                  onChange={(value) => {
                    setTestsetContent(value);
                    setError(null);
                  }}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Format Example:</p>
                <pre className="bg-muted p-2 rounded text-xs">
{`{"id": "1", "content": "What is 2+2?", "expected_answer": "4", "category": "math"}
{"id": "2", "content": "Explain AI", "expected_answer": "...", "difficulty": "hard"}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Prompts</div>
                <div className="text-2xl font-semibold">
                  {testsetContent.trim().split('\n').filter(line => line.trim()).length}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">With Expected Answers</div>
                <div className="text-2xl font-semibold">
                  {testsetContent.trim().split('\n').filter(line => {
                    try {
                      return line.trim() && JSON.parse(line).expected_answer;
                    } catch {
                      return false;
                    }
                  }).length}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Categories</div>
                <div className="text-2xl font-semibold">
                  {new Set(testsetContent.trim().split('\n').map(line => {
                    try {
                      return line.trim() && JSON.parse(line).category;
                    } catch {
                      return null;
                    }
                  }).filter(Boolean)).size}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Valid Lines</div>
                <div className="text-2xl font-semibold">
                  {testsetContent.trim().split('\n').filter(line => {
                    try {
                      return line.trim() && JSON.parse(line);
                    } catch {
                      return false;
                    }
                  }).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}