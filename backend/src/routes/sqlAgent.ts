import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { generateSqlFromQuestion } from "../sql-agent/generateSql";
import {
  MAX_ROWS,
  validateReadonlySql,
  wrapSelectWithRowLimit,
} from "../sql-agent/validateSql";

const router = Router();

const QuestionSchema = z.object({
  question: z.string().min(1, "question is required"),
});

const ExecuteSchema = z.object({
  sql: z.string().min(1, "sql is required"),
});

router.post("/generate", async (req, res) => {
  const parsed = QuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  const { question } = parsed.data;

  const gen = await generateSqlFromQuestion(question);
  if (!gen.ok) {
    return res.status(400).json({
      status: "error",
      error: gen.error,
    });
  }

  const validated = validateReadonlySql(gen.sql);
  if (!validated.ok) {
    return res.status(400).json({
      status: "error",
      error: validated.error,
      generatedSql: stripForClient(gen.sql),
    });
  }

  return res.json({
    status: "ok",
    data: {
      sql: validated.sql,
      rationale: gen.rationale,
    },
  });
});

/** Step 2: run a previously generated & validated SELECT (re-validated here). */
router.post("/execute", async (req, res) => {
  const parsed = ExecuteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  const validated = validateReadonlySql(parsed.data.sql);
  if (!validated.ok) {
    return res.status(400).json({
      status: "error",
      error: validated.error,
      generatedSql: stripForClient(parsed.data.sql),
    });
  }

  const wrapped = wrapSelectWithRowLimit(validated.sql);

  try {
    const result = await pool.query(wrapped);
    const columns = result.fields.map((f) => f.name);
    const rows = result.rows as Record<string, unknown>[];

    return res.json({
      status: "ok",
      data: {
        sql: validated.sql,
        columns,
        rows,
        rowCount: rows.length,
        maxRows: MAX_ROWS,
      },
    });
  } catch {
    return res.status(400).json({
      status: "error",
      error:
        "Query execution failed. Check SQL semantics and table/column names.",
      generatedSql: stripForClient(validated.sql),
    });
  }
});

/** One-shot: generate + execute (same as calling /generate then /execute). */
router.post("/query", async (req, res) => {
  const parsed = QuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  const { question } = parsed.data;

  const gen = await generateSqlFromQuestion(question);
  if (!gen.ok) {
    return res.status(400).json({
      status: "error",
      error: gen.error,
    });
  }

  const validated = validateReadonlySql(gen.sql);
  if (!validated.ok) {
    return res.status(400).json({
      status: "error",
      error: validated.error,
      generatedSql: stripForClient(gen.sql),
    });
  }

  const wrapped = wrapSelectWithRowLimit(validated.sql);

  try {
    const result = await pool.query(wrapped);
    const columns = result.fields.map((f) => f.name);
    const rows = result.rows as Record<string, unknown>[];

    return res.json({
      status: "ok",
      data: {
        sql: validated.sql,
        rationale: gen.rationale,
        columns,
        rows,
        rowCount: rows.length,
        maxRows: MAX_ROWS,
      },
    });
  } catch {
    return res.status(400).json({
      status: "error",
      error:
        "Query execution failed. Check SQL semantics and table/column names.",
      generatedSql: stripForClient(validated.sql),
    });
  }
});

function stripForClient(sql: string): string {
  return sql.length > 2000 ? `${sql.slice(0, 2000)}…` : sql;
}

export default router;
