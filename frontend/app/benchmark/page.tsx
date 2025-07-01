'use client';

import { useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { TwoPane } from '@/components/TwoPane';
import { ResultTable } from '@/components/ResultTable';
import { ToolLogDrawer } from '@/components/ToolLogDrawer';
import { CoTToggle } from '@/components/CoTToggle';
import { Sparkline } from '@/components/Sparkline';
import { useBenchmarkRun, BenchmarkPrompt } from '@/lib/useBenchmarkRun';
import { Play, RotateCcw, Download, Upload, Zap, AlertCircle } from 'lucide-react';
import { CostMeter } from '@/components/CostMeter';
import { ErrorBanner } from '@/components/ErrorBanner';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useModels } from '@/hooks/useModels';
import { useStore } from '@/store';
import { filterModelsWithToolSupport } from '@/lib/modelSupportsTools';

export default function BenchmarkPage() {
  const searchParams = useSearchParams();
  const viewId = searchParams.get('view');
  
  const {
    benchmarkProvider,
    setBenchmarkProvider,
    benchmarkModel,
    setBenchmarkModel,
    evaluatorProvider,
    setEvaluatorProvider,
    evaluatorModel,
    setEvaluatorModel,
    benchmarkPrompts,
    setBenchmarkPrompts,
    benchmarkName,
    setBenchmarkName,
    showCoT,
    setShowCoT,
    systemPrompt,
    setSystemPrompt,
    benchmarkEnableTools,
    setBenchmarkEnableTools,
  } = useStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasApiKey } = useApiKeys();
  const { models, loading: modelsLoading } = useModels(benchmarkProvider);
  const { models: evaluatorModels, loading: evaluatorModelsLoading } = useModels(evaluatorProvider);
  
  // Filter models based on tool support when tools are enabled
  const filteredModels = benchmarkEnableTools 
    ? filterModelsWithToolSupport(models, benchmarkProvider)
    : models;
  const filteredEvaluatorModels = benchmarkEnableTools
    ? filterModelsWithToolSupport(evaluatorModels, evaluatorProvider)
    : evaluatorModels;

  // Update model when provider changes or models load
  useEffect(() => {
    if (filteredModels.length > 0) {
      const modelExists = filteredModels.some(m => m.id === benchmarkModel);
      if (!modelExists) {
        setBenchmarkModel(filteredModels[0].id);
      }
    }
  }, [benchmarkProvider, filteredModels, benchmarkModel, setBenchmarkModel]);
  
  // Update evaluator model when provider changes or models load
  useEffect(() => {
    if (filteredEvaluatorModels.length > 0) {
      const modelExists = filteredEvaluatorModels.some(m => m.id === evaluatorModel);
      if (!modelExists) {
        setEvaluatorModel(filteredEvaluatorModels[0].id);
      }
    }
  }, [evaluatorProvider, filteredEvaluatorModels, evaluatorModel, setEvaluatorModel]);
  
  const { customTestsetData, setCustomTestsetData } = useStore();
  
  const { 
    currentRun,
    isRunning, 
    progress,
    startBenchmark,
    exportRun,
    resetRun,
    loadRun
  } = useBenchmarkRun();
  
  // Note: customTestsetData is loaded from the test set page
  // It will be cleared after the benchmark is started
  
  // Load historical run if viewing
  useEffect(() => {
    if (viewId) {
      loadRun(viewId);
    }
  }, [viewId, loadRun]);
  
  const results = currentRun?.results || [];
  const summary = currentRun?.summary || null;
  const error = currentRun?.error || null;

  const handleRun = () => {
    const promptLines = benchmarkPrompts.split('\n').filter(line => line.trim());
    
    // Check if we have custom testset data from the store
    let benchmarkPromptsToRun: BenchmarkPrompt[];
    
    if (customTestsetData) {
      try {
        // Parse the JSONL format from custom testset
        const lines = customTestsetData.trim().split('\n');
        benchmarkPromptsToRun = lines.map(line => {
          const obj = JSON.parse(line);
          return {
            id: obj.id,
            content: obj.content,
            expected_answer: obj.expected_answer,
            category: obj.category,
            difficulty: obj.difficulty,
          };
        });
        setCustomTestsetData(null); // Clear after use
      } catch {
        // Fallback to simple format
        benchmarkPromptsToRun = promptLines.map((content, index) => ({
          id: String(index + 1),
          content: content.trim(),
        }));
      }
    } else {
      benchmarkPromptsToRun = promptLines.map((content, index) => ({
        id: String(index + 1),
        content: content.trim(),
      }));
    }
    
    const config = {
      subject_model: benchmarkModel,
      subject_provider: benchmarkProvider,
      evaluator_model: evaluatorModel,
      evaluator_provider: evaluatorProvider,
      enable_tools: benchmarkEnableTools,
    };
    
    startBenchmark(benchmarkPromptsToRun, config);
  };

  const handleQuickBenchmark = async () => {
    try {
      const response = await fetch('/starter-testset.jsonl');
      const text = await response.text();
      const lines = text.trim().split('\n');
      const starterPrompts: BenchmarkPrompt[] = lines.map(line => {
        const data = JSON.parse(line);
        return {
          id: data.id,
          content: data.content,
          expected_answer: data.expected_answer,
          category: data.category,
          difficulty: data.difficulty
        };
      });

      const config = {
        subject_model: benchmarkModel,
        subject_provider: benchmarkProvider,
        evaluator_model: evaluatorModel,
        evaluator_provider: evaluatorProvider,
        enable_tools: benchmarkEnableTools,
      };

      setBenchmarkName('Starter Test Set');
      setBenchmarkPrompts(starterPrompts.map(p => p.content).join('\n'));
      startBenchmark(starterPrompts, config);
    } catch (err) {
      console.error('Failed to load starter test set:', err);
    }
  };

  const handleExport = () => {
    exportRun();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Load configuration
        setBenchmarkName(data.metadata?.name || 'Imported Benchmark');
        setBenchmarkProvider(data.config?.provider || 'openai');
        setBenchmarkModel(data.config?.model || 'gpt-3.5-turbo');
        
        // Load prompts - convert to JSONL format for customTestsetData
        if (data.prompts && Array.isArray(data.prompts)) {
          const jsonlData = data.prompts.map((p: any, index: number) => {
            return JSON.stringify({
              id: p.id || String(index + 1),
              content: p.content,
              expected_answer: p.expected_answer,
              category: p.category,
              difficulty: p.difficulty
            });
          }).join('\n');
          
          setCustomTestsetData(jsonlData);
          const importedPrompts = data.prompts.map((p: any) => p.content).join('\n');
          setBenchmarkPrompts(importedPrompts);
        }
        
        // Reset current results
        resetRun();
        
        alert('Benchmark configuration imported successfully. Click "Run Benchmark" to execute.');
      } catch (err) {
        console.error('Failed to import benchmark:', err);
        alert('Failed to import benchmark file. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const scores = results.map(r => r.score);

  const leftPanel = (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Benchmark Configuration</h2>
      
      <div className="space-y-2">
        <Label htmlFor="provider">Provider</Label>
        <Select value={benchmarkProvider} onValueChange={(v) => setBenchmarkProvider(v as any)}>
          <SelectTrigger id="provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="deepseek">DeepSeek</SelectItem>
            <SelectItem value="ollama">Ollama</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Select value={benchmarkModel} onValueChange={setBenchmarkModel} disabled={modelsLoading}>
          <SelectTrigger id="model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filteredModels.length === 0 && !modelsLoading ? (
              <SelectItem value="none" disabled>
                {benchmarkEnableTools && models.length > 0 
                  ? "No models with tool support available" 
                  : "No models available"}
              </SelectItem>
            ) : (
              filteredModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {modelsLoading && (
          <p className="text-xs text-muted-foreground">Loading models...</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="system-prompt">System Prompt (Optional)</Label>
        <Textarea
          id="system-prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={3}
          placeholder="Enter a system prompt to be sent with every test prompt..."
          disabled={isRunning}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          This system prompt will be sent to the model being benchmarked before each test prompt.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="enable-tools">Enable Tool Use</Label>
            <p className="text-xs text-muted-foreground">
              Allow models to use tools like web search during benchmarking
            </p>
          </div>
          <Switch
            id="enable-tools"
            checked={benchmarkEnableTools}
            onCheckedChange={setBenchmarkEnableTools}
          />
        </div>
        {benchmarkEnableTools && benchmarkProvider === 'ollama' && (
          <Alert className="border-orange-500/50 text-orange-600 dark:border-orange-500/30 dark:text-orange-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ollama models do not currently support tool use
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-medium mb-4">Evaluator Configuration</h3>
        
        <div className="space-y-2">
          <Label htmlFor="evaluator-provider">Evaluator Provider</Label>
          <Select value={evaluatorProvider} onValueChange={(v) => setEvaluatorProvider(v)}>
            <SelectTrigger id="evaluator-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="deepseek">DeepSeek</SelectItem>
              <SelectItem value="ollama">Ollama</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 mt-2">
          <Label htmlFor="evaluator-model">Evaluator Model</Label>
          <Select value={evaluatorModel} onValueChange={setEvaluatorModel} disabled={evaluatorModelsLoading}>
            <SelectTrigger id="evaluator-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filteredEvaluatorModels.length === 0 && !evaluatorModelsLoading ? (
                <SelectItem value="none" disabled>
                  {benchmarkEnableTools && evaluatorModels.length > 0 
                    ? "No models with tool support available" 
                    : "No models available"}
                </SelectItem>
              ) : (
                filteredEvaluatorModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {evaluatorModelsLoading && (
            <p className="text-xs text-muted-foreground">Loading models...</p>
          )}
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-medium mb-2">Test Set</h3>
        {customTestsetData ? (
          <div className="space-y-2">
            <Alert className="border-green-500/50 text-green-600 dark:border-green-500/30 dark:text-green-400">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Test set loaded successfully!</strong>
                <br />
                {(() => {
                  const lines = customTestsetData.trim().split('\n').filter(line => line.trim());
                  const withExpected = lines.filter(line => {
                    try {
                      return JSON.parse(line).expected_answer;
                    } catch {
                      return false;
                    }
                  }).length;
                  return (
                    <>
                      {lines.length} prompts loaded ({withExpected} with expected answers).
                      <br />
                      Click &quot;Run Benchmark&quot; below to start testing.
                    </>
                  );
                })()}
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomTestsetData(null)}
              className="w-full"
            >
              Clear Test Set
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            To run a benchmark, first create or load a test set from the{' '}
            <a href="/testset" className="text-primary underline">Test Set</a> tab.
          </p>
        )}
      </div>

      <CostMeter 
        provider={benchmarkProvider}
        model={benchmarkModel}
        promptCount={customTestsetData ? customTestsetData.trim().split('\n').length : 0}
      />

      <div className="space-y-2">
        <Button
          onClick={handleQuickBenchmark}
          disabled={isRunning}
          variant="secondary"
          className="w-full"
        >
          <Zap className="w-4 h-4 mr-2" />
          Run Quick Benchmark (20 prompts)
        </Button>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleRun} 
            disabled={isRunning || (!customTestsetData && !benchmarkPrompts.trim())}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Benchmark'}
          </Button>
          <Button 
            onClick={resetRun} 
            variant="outline"
            disabled={isRunning}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex-1"
            disabled={isRunning}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex-1"
            disabled={!summary}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      {isRunning && (
        <Progress value={(progress.current / progress.total) * 100} className="w-full" />
      )}

      {error && (
        <ErrorBanner 
          error={error} 
          onRetry={handleRun}
        />
      )}
    </div>
  );

  const rightPanel = (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Results
          {viewId && <span className="text-sm font-normal text-muted-foreground ml-2">(Historical View)</span>}
        </h2>
        <div className="flex items-center gap-4">
          <CoTToggle enabled={showCoT} onChange={setShowCoT} />
          <ToolLogDrawer results={results} />
        </div>
      </div>

      {summary && (
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Prompts</div>
              <div className="text-2xl font-semibold">{summary.total_prompts}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Passed</div>
              <div className="text-2xl font-semibold text-green-600">{summary.passed}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Failed</div>
              <div className="text-2xl font-semibold text-red-600">{summary.failed}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Score</div>
              <div className="text-2xl font-semibold">
                {(summary.average_score * 100).toFixed(0)}%
              </div>
            </div>
          </div>
          
          {scores.length > 1 && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-2">Score Trend</div>
              <Sparkline data={scores} />
              {/* Debug: Show scores */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-muted-foreground mt-1">
                  Scores: {scores.map(s => (s * 100).toFixed(0) + '%').join(', ')}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <ResultTable results={results} showCoT={showCoT} />
    </div>
  );

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <TwoPane 
        left={leftPanel} 
        right={rightPanel}
        leftClassName="bg-muted/50"
      />
    </div>
  );
}