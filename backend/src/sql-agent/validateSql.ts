const FORBIDDEN = new RegExp(
  String.raw`\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY|EXEC|EXECUTE|CALL|VACUUM|ANALYZE|SET|LISTEN|NOTIFY|LOAD_FILE|INTO\s+OUTFILE|PG_SLEEP|LO_)\b`,
  "i",
);

/**
 * Strips markdown code fences and returns trimmed SQL text.
 */
export function stripSqlFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s
      .replace(/^```(?:sql)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
  }
  return s.trim();
}

export type ValidateSqlResult =
  | { ok: true; sql: string }
  | { ok: false; error: string };

/**
 * Validates that `sql` is a single read-only SELECT suitable for execution.
 * Disallows comments and multiple statements to reduce injection surface.
 */
export function validateReadonlySql(raw: string): ValidateSqlResult {
  const sql = stripSqlFences(raw);
  if (sql.length === 0) {
    return { ok: false, error: "Generated SQL is empty." };
  }
  if (/--|\/\*/.test(sql)) {
    return { ok: false, error: "SQL comments are not allowed." };
  }
  const parts = sql
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    return { ok: false, error: "Only a single SQL statement is allowed." };
  }
  const single = parts[0] ?? sql.replace(/;\s*$/, "").trim();
  if (!single) {
    return { ok: false, error: "Only a single SQL statement is allowed." };
  }
  if (FORBIDDEN.test(single)) {
    return {
      ok: false,
      error: "Only read-only SELECT queries are allowed.",
    };
  }
  const leading = single.replace(/^\s+/, "");
  if (!/^\(?\s*select\b/i.test(leading)) {
    return { ok: false, error: "Query must be a SELECT statement." };
  }
  return { ok: true, sql: single };
}

const MAX_ROWS = 500;

/**
 * Wraps validated SELECT in an outer select with LIMIT for row cap.
 */
export function wrapSelectWithRowLimit(innerSql: string): string {
  const inner = innerSql.replace(/;\s*$/, "").trim();
  return `SELECT * FROM (${inner}) AS _sql_agent_sub LIMIT ${MAX_ROWS}`;
}

export { MAX_ROWS };
