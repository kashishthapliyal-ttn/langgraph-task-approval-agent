import { Router } from "express";
import { SCHEMA_TABLES } from "../sql-agent/schema";

const router = Router();

router.get("/schema", (_req, res) => {
  res.json({
    status: "ok",
    data: {
      tables: SCHEMA_TABLES,
    },
  });
});

export default router;
