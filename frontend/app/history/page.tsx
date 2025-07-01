'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { benchmarkDB, DBBenchmarkRun } from '@/lib/benchmarkDB';
import { Trash2, Download, Eye, Calendar, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function HistoryPage() {
  const [runs, setRuns] = useState<DBBenchmarkRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const router = useRouter();

  // Load runs on mount
  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const allRuns = await benchmarkDB.getAllBenchmarkRuns();
      setRuns(allRuns);
    } catch (error) {
      console.error('Failed to load benchmark runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this benchmark run?')) {
      try {
        await benchmarkDB.deleteBenchmarkRun(id);
        await loadRuns();
      } catch (error) {
        console.error('Failed to delete run:', error);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you sure you want to delete ALL benchmark runs? This cannot be undone.')) {
      try {
        await benchmarkDB.deleteAllBenchmarkRuns();
        await loadRuns();
      } catch (error) {
        console.error('Failed to delete all runs:', error);
      }
    }
  };

  const handleExport = (run: DBBenchmarkRun) => {
    const blob = new Blob([JSON.stringify(run, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleView = (run: DBBenchmarkRun) => {
    // Store the run in sessionStorage to view it
    sessionStorage.setItem('viewBenchmarkRun', JSON.stringify(run));
    router.push('/benchmark?view=' + run.id);
  };

  // Filter runs based on search and filters
  const filteredRuns = runs.filter(run => {
    const matchesSearch = !searchTerm || 
      run.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.config.subject_model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProvider = filterProvider === 'all' || run.config.subject_provider === filterProvider;
    const matchesModel = filterModel === 'all' || run.config.subject_model === filterModel;
    
    return matchesSearch && matchesProvider && matchesModel;
  });

  // Get unique providers and models for filters
  const providers = [...new Set(runs.map(r => r.config.subject_provider))];
  const models = [...new Set(runs.map(r => r.config.subject_model))];

  if (loading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center">Loading benchmark history...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Benchmark History</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your past benchmark runs
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={filterModel} onValueChange={setFilterModel}>
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {models.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={runs.length === 0}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredRuns.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {runs.length === 0 
              ? "No benchmark runs found. Run a benchmark to see results here."
              : "No runs match your filters."}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {filteredRuns.map((run) => (
            <Card key={run.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {run.name || `Benchmark ${run.id.substring(0, 8)}`}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center gap-4 text-sm">
                        <span>{run.config.subject_provider} / {run.config.subject_model}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(run.timestamp), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(run.timestamp), 'h:mm a')}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(run)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport(run)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(run.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {run.summary && (
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total Prompts</div>
                      <div className="font-semibold">{run.summary.total_prompts || 0}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Passed</div>
                      <div className="font-semibold text-green-600">{run.summary.passed || 0}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Failed</div>
                      <div className="font-semibold text-red-600">{run.summary.failed || 0}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Score</div>
                      <div className="font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {((run.summary.average_score || 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Time</div>
                      <div className="font-semibold">
                        {run.summary.total_time ? `${run.summary.total_time.toFixed(1)}s` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}