import { z } from "zod";
import { getChatModel } from "../utils/model";
import { buildSchemaForLlm } from "./buildSchemaForLlm";
import type { SchemaTable } from "./schemaTypes";
import { stripSqlFences } from "./validateSql";

const SqlOutSchema = z.object({
  sql: z.string().min(1),
  rationale: z.string().optional(),
});

export type GenerateSqlResult =
  | { ok: true; sql: string; rationale?: string }
  | { ok: false; error: string };

function buildSystemPrompt(tables: SchemaTable[]): string {
  return [
    "You are a careful PostgreSQL query generator.",
    buildSchemaForLlm(tables),
    "",
    "Rules:",
    "- Output a single SELECT statement only (no DDL/DML, no multiple statements).",
    "- No SQL comments.",
    "- Use only the tables and columns described above.",
    "- Prefer LIMIT 500 on the outermost query when returning many rows.",
    "- Return JSON with keys `sql` (raw SQL only, no markdown fences) and optional `rationale`.",
  ].join("\n\n");
}

function parseModelJson(text: string): z.infer<typeof SqlOutSchema> | null {
  const trimmed = stripSqlFences(text.trim());
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const result = SqlOutSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    const selectMatch = /SELECT[\s\S]+/i.exec(trimmed);
    if (selectMatch) {
      return { sql: selectMatch[0].replace(/;\s*$/, "").trim() };
    }
    return null;
  }
}

export async function generateSqlFromQuestion(
  question: string,
  tables: SchemaTable[],
): Promise<GenerateSqlResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { ok: false, error: "Question is empty." };
  }

  if (tables.length === 0) {
    return {
      ok: false,
      error:
        "No schema loaded. Upload a .sql file with CREATE TABLE statements first.",
    };
  }

  const model = getChatModel({ temperature: 0.1 });
  const messages = [
    { role: "system" as const, content: buildSystemPrompt(tables) },
    {
      role: "human" as const,
      content: `User question:\n${trimmed}\n\nProduce the best PostgreSQL SELECT for this question.`,
    },
  ];

  try {
    const structured = model.withStructuredOutput(SqlOutSchema, {
      name: "sql_query",
    });
    const out = await structured.invoke(messages);
    const sql = out.sql?.trim();
    if (!sql) {
      return { ok: false, error: "Model returned no SQL." };
    }
    return { ok: true, sql, rationale: out.rationale };
  } catch (structuredErr) {
    try {
      const response = await model.invoke(messages);
      const text =
        typeof response.content === "string"
          ? response.content
          : Array.isArray(response.content)
            ? response.content
                .map((p) =>
                  typeof p === "string"
                    ? p
                    : ((p as { text?: string }).text ?? ""),
                )
                .join("")
            : String(response.content ?? "");

      const parsed = parseModelJson(text);
      if (!parsed?.sql?.trim()) {
        const hint =
          structuredErr instanceof Error
            ? structuredErr.message
            : "Unknown model error";
        return {
          ok: false,
          error: `Failed to generate SQL from the model. ${hint}`,
        };
      }
      return {
        ok: true,
        sql: parsed.sql.trim(),
        rationale: parsed.rationale,
      };
    } catch (fallbackErr) {
      const hint =
        fallbackErr instanceof Error
          ? fallbackErr.message
          : structuredErr instanceof Error
            ? structuredErr.message
            : "Unknown model error";
      return {
        ok: false,
        error: `Failed to generate SQL from the model. ${hint}`,
      };
    }
  }
}
