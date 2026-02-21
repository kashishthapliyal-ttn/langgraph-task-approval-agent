import dotenv from 'dotenv';
dotenv.config();

import { z } from 'zod';

const EnvSchema = z.object({
  GOOGLE_API_KEY: z.string().min(1, 'Gemini Api Key is Missing'),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash-lite'),
  GROQ_API_KEY: z.string().min(1, 'GROQ Api Key is Missing'),
  GROQ_MODEL: z.string().default('llama-3.1-8b-instant'),
  PROVIDER: z.string(),
  PORT: z.string(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error('Error while parsing env');
}

const raw = parsed.data;

export const env = Object.freeze({
  GOOGLE_API_KEY: raw.GOOGLE_API_KEY,
  GEMINI_MODEL: raw.GEMINI_MODEL,
  GROQ_API_KEY: raw.GROQ_API_KEY,
  GROQ_MODEL: raw.GROQ_MODEL,
  PROVIDER: raw.PROVIDER,
  PORT: raw.PORT,
});
