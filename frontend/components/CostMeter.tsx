"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CostMeterProps {
  provider: string;
  model: string;
  promptCount: number;
}

type TokenRate = {
  input: number;
  output: number;
};

type ProviderRates = {
  [model: string]: TokenRate;
};

// Token estimation rates (per 1K tokens)
const TOKEN_RATES: Record<string, ProviderRates> = {
  openai: {
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
  },
  anthropic: {
    "claude-3-haiku": { input: 0.00025, output: 0.00125 },
    "claude-3-sonnet": { input: 0.003, output: 0.015 },
    "claude-3-opus": { input: 0.015, output: 0.075 },
  },
  deepseek: {
    "deepseek-chat": { input: 0.0001, output: 0.0002 },
    "deepseek-coder": { input: 0.0001, output: 0.0002 },
  },
  ollama: {
    "llama2": { input: 0, output: 0 },
    "mistral": { input: 0, output: 0 },
    "codellama": { input: 0, output: 0 },
  },
};

export function CostMeter({ provider, model, promptCount }: CostMeterProps) {
  const [estimatedCost, setEstimatedCost] = useState<{
    min: number;
    max: number;
  } | null>(null);

  useEffect(() => {
    const calculateCost = () => {
      const providerRates = TOKEN_RATES[provider];
      if (!providerRates) {
        setEstimatedCost(null);
        return;
      }

      const rates = providerRates[model];
      if (!rates || promptCount === 0) {
        setEstimatedCost(null);
        return;
      }

      // Estimate tokens per prompt (conservative estimates)
      const avgInputTokens = 50; // Average prompt length
      const minOutputTokens = 100; // Minimum response
      const maxOutputTokens = 500; // Maximum response

      const totalInputTokens = avgInputTokens * promptCount;
      const totalMinOutputTokens = minOutputTokens * promptCount;
      const totalMaxOutputTokens = maxOutputTokens * promptCount;

      const inputCost = (totalInputTokens / 1000) * rates.input;
      const minOutputCost = (totalMinOutputTokens / 1000) * rates.output;
      const maxOutputCost = (totalMaxOutputTokens / 1000) * rates.output;

      setEstimatedCost({
        min: inputCost + minOutputCost,
        max: inputCost + maxOutputCost,
      });
    };

    calculateCost();
  }, [provider, model, promptCount]);

  if (!estimatedCost || promptCount === 0) {
    return null;
  }

  const isFreeTier = provider === "ollama";

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Cost Estimate
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isFreeTier ? (
          <div className="text-sm text-muted-foreground">
            Local model - no API costs
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              ${estimatedCost.min.toFixed(3)} - ${estimatedCost.max.toFixed(3)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Based on {promptCount} prompt{promptCount !== 1 ? "s" : ""}
            </div>
          </>
        )}
        {!isFreeTier && estimatedCost.max > 1 && (
          <Alert className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This benchmark may incur significant API costs. Consider reducing
              the number of prompts or using a cheaper model.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}