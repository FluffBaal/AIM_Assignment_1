import { useEffect } from 'react';
import { useStore } from '@/store';

/**
 * Hook for managing custom testset transfer between pages via store
 * This replaces the sessionStorage-based approach
 */
export function useCustomTestset() {
  const { 
    testsetContent, 
    setTestsetContent,
    lastBenchmarkRun,
    setLastBenchmarkRun,
  } = useStore();

  // Function to prepare a custom testset for benchmark
  const prepareCustomTestset = () => {
    // Parse the testset content and store it in the store for the benchmark page
    const lines = testsetContent.trim().split('\n').filter(line => line.trim());
    const prompts = lines.map(line => {
      try {
        const obj = JSON.parse(line);
        return obj.content;
      } catch {
        return null;
      }
    }).filter(Boolean);

    return {
      prompts: prompts.join('\n'),
      fullData: testsetContent,
    };
  };

  // Clean up sessionStorage on mount (migration)
  useEffect(() => {
    // Check if there's data in sessionStorage and migrate it
    const customTestset = sessionStorage.getItem('custom-testset');
    const customTestsetData = sessionStorage.getItem('custom-testset-data');
    
    if (customTestset || customTestsetData) {
      // Clean up old sessionStorage
      sessionStorage.removeItem('custom-testset');
      sessionStorage.removeItem('custom-testset-data');
    }
  }, []);

  return {
    prepareCustomTestset,
  };
}