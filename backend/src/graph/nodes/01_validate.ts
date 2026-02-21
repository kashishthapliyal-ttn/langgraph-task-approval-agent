import { State } from '../types';

const MAX_WORDS = 300;
const MAX_TOKENS = 1000;

export async function ValidateNode(state: State): Promise<Partial<State>> {
  const raw = state.input ?? '';
  const trimmed = raw.trim();

  if (!trimmed) {
    return {
      status: 'cancelled',
      message: 'Please enter a valid prompt.',
    };
  }

  const cleaned = trimmed.replace(/[\u0000-\u001F\u007F]/g, '');

  const suspiciousPatterns = [
    /ignore previous instructions/i,
    /disregard system prompt/i,
    /act as root/i,
  ];

  if (suspiciousPatterns.some((p) => p.test(cleaned))) {
    return {
      status: 'cancelled',
      message: 'Suspicious input detected.',
    };
  }

  const words = cleaned.split(/\s+/);
  const limited = words.slice(0, MAX_WORDS).join(' ');

  const approxTokens = Math.ceil(limited.length / 4);
  if (approxTokens > MAX_TOKENS) {
    return {
      status: 'cancelled',
      message: 'Input too large.',
    };
  }

  return {
    input: limited,
  };
}
