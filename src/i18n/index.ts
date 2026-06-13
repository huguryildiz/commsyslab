import { en } from './en';

const dict: Record<string, string> = en;

/** Translate a key. Falls back to the key itself if missing. */
export function t(key: string): string {
  return dict[key] ?? key;
}
