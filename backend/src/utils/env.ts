import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";

const providerSchema = z.preprocess(
  (v) => (typeof v === "string" ? String(v).toLowerCase().trim() : "groq"),
  z.enum(["groq", "gemini"]),
);

const boolFromEnv = z.preprocess((v) => {
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}, z.boolean());

const EnvSchema = z
  .object({
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_USERNAME: z.string().min(1, "DB_USERNAME is required"),
    DB_PASSWORD: z.string().default(""),
    DB_NAME: z.string().min(1, "DB_NAME is required"),
    DB_SSL: boolFromEnv.default(false),
    GEMINI_MODEL: z.string().default("gemini-2.0-flash-lite"),
    GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
    PROVIDER: providerSchema,
    PORT: z.coerce.string().default("5000"),
    GOOGLE_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.PROVIDER === "gemini" && !data.GOOGLE_API_KEY?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "GOOGLE_API_KEY is required when PROVIDER is gemini",
        path: ["GOOGLE_API_KEY"],
      });
    }
    if (data.PROVIDER === "groq" && !data.GROQ_API_KEY?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "GROQ_API_KEY is required when PROVIDER is groq",
        path: ["GROQ_API_KEY"],
      });
    }
  });

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => i.message).join("; ");
  throw new Error(`Error while parsing env: ${msg}`);
}

const raw = parsed.data;

export const env = Object.freeze({
  DB_HOST: raw.DB_HOST,
  DB_PORT: raw.DB_PORT,
  DB_USERNAME: raw.DB_USERNAME,
  DB_PASSWORD: raw.DB_PASSWORD,
  DB_NAME: raw.DB_NAME,
  DB_SSL: raw.DB_SSL,
  GOOGLE_API_KEY: raw.GOOGLE_API_KEY ?? "",
  GEMINI_MODEL: raw.GEMINI_MODEL,
  GROQ_API_KEY: raw.GROQ_API_KEY ?? "",
  GROQ_MODEL: raw.GROQ_MODEL,
  PROVIDER: raw.PROVIDER,
  PORT: raw.PORT,
});
