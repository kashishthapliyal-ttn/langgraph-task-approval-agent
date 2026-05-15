import { Router } from "express";
import { z } from "zod";
import { generateSqlFromQuestion } from "../sql-agent/generateSql";
import { getSchemaTables } from "../sql-agent/schemaStore";
import type { SchemaColumn, SchemaTable } from "../sql-agent/schemaTypes";
import { validateReadonlySql } from "../sql-agent/validateSql";

const SchemaColumnSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().nullish(),
  nullable: z.boolean().nullish(),
  primaryKey: z.boolean().nullish(),
  references: z.string().nullish(),
});

const SchemaTableSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  relationships: z.array(z.string()).nullish(),
  columns: z.array(SchemaColumnSchema),
});

const GenerateBodySchema = z
  .object({
    question: z.string().min(1, "question is required"),
    schemaId: z.string().min(1).optional(),
    tables: z.array(SchemaTableSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.schemaId && (!data.tables || data.tables.length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "schemaId or tables is required",
        path: ["schemaId"],
      });
    }
  });

function normalizeTables(
  tables: z.infer<typeof SchemaTableSchema>[],
): SchemaTable[] {
  return tables.map((t) => ({
    name: t.name,
    description: t.description,
    relationships: t.relationships ?? undefined,
    columns: t.columns.map(
      (c): SchemaColumn => ({
        name: c.name,
        type: c.type,
        description: c.description ?? undefined,
        nullable: c.nullable ?? undefined,
        primaryKey: c.primaryKey ?? undefined,
        references: c.references ?? undefined,
      }),
    ),
  }));
}

const router = Router();

router.post("/generate", async (req, res) => {
  const parsed = GenerateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      error: "Invalid request body",
      details: parsed.error.issues,
    });
  }

  const { question, schemaId, tables: bodyTables } = parsed.data;

  let tables: SchemaTable[] | null = bodyTables
    ? normalizeTables(bodyTables)
    : null;
  if (schemaId) {
    const stored = getSchemaTables(schemaId);
    if (!stored) {
      return res.status(400).json({
        status: "error",
        error:
          "Schema session expired or not found. Upload your .sql file again.",
      });
    }
    tables = stored;
  }

  if (!tables?.length) {
    return res.status(400).json({
      status: "error",
      error: "No schema loaded. Upload a .sql file first.",
    });
  }

  const gen = await generateSqlFromQuestion(question, tables);
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

function stripForClient(sql: string): string {
  return sql.length > 2000 ? `${sql.slice(0, 2000)}…` : sql;
}

export default router;
