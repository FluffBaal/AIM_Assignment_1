import { useStore } from '@/store';

export type Preferences = {
  systemPrompt: string;
};

export function usePreferences() {
  const { systemPrompt } = useStore();

  // Return preferences object for backward compatibility
  return {
    systemPrompt,
  };
}