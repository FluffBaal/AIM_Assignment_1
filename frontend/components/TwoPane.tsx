'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TwoPaneProps {
  left: ReactNode;
  right: ReactNode;
  leftClassName?: string;
  rightClassName?: string;
  className?: string;
}

export function TwoPane({ 
  left, 
  right, 
  leftClassName, 
  rightClassName,
  className 
}: TwoPaneProps) {
  return (
    <div className={cn("flex h-full", className)}>
      <div className={cn("w-1/3 border-r overflow-y-auto", leftClassName)}>
        {left}
      </div>
      <div className={cn("flex-1 overflow-y-auto", rightClassName)}>
        {right}
      </div>
    </div>
  );
}