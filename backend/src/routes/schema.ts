import { Router } from "express";
import { z } from "zod";
import { cloneTables, saveSchemaTables } from "../sql-agent/schemaStore";
import { parseSqlSchema } from "../sql-parser/parseSqlSchema";

const router = Router();

const ParseBodySchema = z.object({
  sql: z.string().min(1, "sql is required"),
});

router.post("/parse", (req, res) => {
  const parsed = ParseBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  const result = parseSqlSchema(parsed.data.sql);
  if (!result.ok) {
    return res.status(400).json({
      status: "error",
      error: result.error,
    });
  }

  const tables = cloneTables(result.tables);
  const schemaId = saveSchemaTables(tables);

  return res.json({
    status: "ok",
    data: {
      schemaId,
      tables,
    },
  });
});

export default router;
