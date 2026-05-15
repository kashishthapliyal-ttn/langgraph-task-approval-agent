import type { SchemaColumn, SchemaTable } from "./schemaTypes";

function columnLine(c: SchemaColumn): string {
  let nullStr = "";
  if (c.nullable === false) nullStr = " NOT NULL";
  else if (c.nullable === true) nullStr = " NULL";
  const ref = c.references ? ` FK→${c.references}` : "";
  const desc = c.description ? ` — ${c.description}` : "";
  return `  - ${c.name} (${c.type}${nullStr})${ref}${desc}`;
}

export function buildSchemaForLlm(tables: SchemaTable[]): string {
  if (tables.length === 0) {
    return "No tables were provided. Upload a .sql file with CREATE TABLE statements first.";
  }

  return [
    "You may ONLY query these PostgreSQL tables with SELECT (read-only).",
    "Schema: public. Use table names exactly as listed.",
    "Prefer explicit column lists; qualify columns with table aliases on joins.",
    "Do not use SQL comments or multiple statements separated by semicolons.",
    "",
    ...tables.map((t) => {
      const rel = (t.relationships ?? []).map((r) => `  • ${r}`).join("\n");
      const relBlock = rel ? `\nRelationships:\n${rel}` : "";
      const cols = t.columns.map(columnLine);
      return [
        `Table: ${t.name}`,
        t.description + relBlock,
        "Columns:",
        ...cols,
      ].join("\n");
    }),
  ].join("\n\n");
}
