import { en } from './en';
import { fourier } from './fourier';
import { analog } from './analog';
import { randomprocess } from './randomprocess';
import { analognoise } from './analognoise';
import { channelcoding } from './channelcoding';
import { wireless } from './wireless';
import { endtoend } from './endtoend';

// Per-track i18n fragments merge into the base dictionary. en.ts stays untouched;
// later fragments win on key collisions (e.g. nav.* keys defined per track).
const dict: Record<string, string> = {
  ...en,
  ...fourier,
  ...analog,
  ...randomprocess,
  ...analognoise,
  ...channelcoding,
  ...wireless,
  ...endtoend,
};

/** Translate a key. Falls back to the key itself if missing. */
export function t(key: string): string {
  return dict[key] ?? key;
}
