'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

interface CoTToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function CoTToggle({ enabled, onChange }: CoTToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="cot-toggle"
        checked={enabled}
        onCheckedChange={onChange}
      />
      <Label 
        htmlFor="cot-toggle" 
        className="flex items-center gap-2 cursor-pointer"
      >
        {enabled ? (
          <>
            <Eye className="w-4 h-4" />
            <span>Show Answers</span>
          </>
        ) : (
          <>
            <EyeOff className="w-4 h-4" />
            <span>Hide Answers</span>
          </>
        )}
      </Label>
    </div>
  );
}