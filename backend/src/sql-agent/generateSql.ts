import { z } from "zod";
import { getChatModel } from "../utils/model";
import { SCHEMA_FOR_LLM } from "./schema";

const SqlOutSchema = z.object({
  sql: z.string().min(1),
  rationale: z.string().optional(),
});

const SYSTEM = [
  "You are a careful PostgreSQL query generator.",
  SCHEMA_FOR_LLM,
  "",
  "Rules:",
  "- Output a single SELECT statement only (no DDL/DML, no multiple statements).",
  "- No SQL comments.",
  "- Use only the tables and columns described above.",
  "- Prefer LIMIT 500 on the outermost query when returning many rows.",
  "- Return JSON matching the schema with key `sql` containing the raw SQL only (no markdown fences).",
].join("\n\n");

export type GenerateSqlResult =
  | { ok: true; sql: string; rationale?: string }
  | { ok: false; error: string };

export async function generateSqlFromQuestion(
  question: string,
): Promise<GenerateSqlResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { ok: false, error: "Question is empty." };
  }

  const model = getChatModel({ temperature: 0.1 });
  const structured = model.withStructuredOutput(SqlOutSchema);

  try {
    const out = await structured.invoke([
      { role: "system", content: SYSTEM },
      {
        role: "human",
        content: `User question:\n${trimmed}\n\nProduce the best PostgreSQL SELECT for this question.`,
      },
    ]);

    const sql = out.sql?.trim();
    if (!sql) {
      return { ok: false, error: "Model returned no SQL." };
    }
    return { ok: true, sql, rationale: out.rationale };
  } catch {
    return { ok: false, error: "Failed to generate SQL from the model." };
  }
}
