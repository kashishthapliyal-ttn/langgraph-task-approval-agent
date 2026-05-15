import type { SchemaColumn, SchemaTable } from "../sql-agent/schemaTypes";

export type ParseSqlSchemaResult =
  | { ok: true; tables: SchemaTable[] }
  | { ok: false; error: string };

const CREATE_TABLE_RE =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:"([^"]+)"|'([^']+)'|(\w+))\.)?(?:"([^"]+)"|'([^']+)'|(\w+))\s*\(/gi;

const SKIP_DEF_RE = /^\s*(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|CHECK|EXCLUDE)\b/i;

const COLUMN_NAME_RE = /^"([^"]+)"|'([^']+)'|(\w+)\s+/;

const REFERENCES_RE =
  /\bREFERENCES\s+(?:"([^"]+)"|'([^']+)'|(\w+))\s*\(\s*(?:"([^"]+)"|'([^']+)'|(\w+))\s*\)/i;

const FOREIGN_KEY_RE =
  /\bFOREIGN\s+KEY\s*\(\s*(?:"([^"]+)"|'([^']+)'|(\w+))\s*\)\s*REFERENCES\s+(?:"([^"]+)"|'([^']+)'|(\w+))\s*\(\s*(?:"([^"]+)"|'([^']+)'|(\w+))\s*\)/i;

const RESERVED_COLUMN_NAMES = new Set(
  [
    "CONSTRAINT",
    "PRIMARY",
    "FOREIGN",
    "KEY",
    "UNIQUE",
    "CHECK",
    "EXCLUDE",
    "REFERENCES",
    "DEFAULT",
    "NOT",
    "NULL",
    "ON",
    "DELETE",
    "CASCADE",
    "SET",
    "CREATE",
    "INDEX",
    "IF",
    "EXISTS",
    "TABLE",
    "ALTER",
    "DROP",
    "INTEGER",
    "INT",
    "SERIAL",
    "BIGSERIAL",
    "SMALLSERIAL",
    "VARCHAR",
    "CHAR",
    "TEXT",
    "BOOLEAN",
    "BOOL",
    "DATE",
    "TIMESTAMP",
    "TIMESTAMPTZ",
    "NUMERIC",
    "DECIMAL",
    "REAL",
    "DOUBLE",
    "PRECISION",
  ].map((s) => s.toUpperCase()),
);

export function stripSqlComments(sql: string): string {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    if (sql[i] === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (sql[i] === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += sql[i];
    i++;
  }
  return out;
}

/** Remove statements that are not CREATE TABLE bodies. */
export function stripNonTableDdl(sql: string): string {
  const withoutComments = stripSqlComments(sql);
  const chunks = withoutComments
    .split(/(?=CREATE\s+TABLE\b)/gi)
    .map((c) => c.trim())
    .filter(Boolean);

  const tableChunks = chunks.filter((c) => /^CREATE\s+TABLE\b/i.test(c));
  if (tableChunks.length > 0) {
    return tableChunks.join("\n\n");
  }
  return withoutComments;
}

function findMatchingParen(sql: string, openIndex: number): number {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = openIndex; i < sql.length; i++) {
    const ch = sql[i];
    if (inSingle) {
      if (ch === "'" && sql[i + 1] === "'") {
        i++;
        continue;
      }
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '"') inDouble = false;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevelCommas(body: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inSingle) {
      if (ch === "'" && body[i + 1] === "'") {
        i++;
        continue;
      }
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '"') inDouble = false;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      const part = body.slice(start, i).trim();
      if (part) parts.push(part);
      start = i + 1;
    }
  }

  const tail = body.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function parseColumnName(def: string): string | null {
  const m = COLUMN_NAME_RE.exec(def);
  if (!m) return null;
  const name = m[1] ?? m[2] ?? m[3] ?? null;
  if (!name || RESERVED_COLUMN_NAMES.has(name.toUpperCase())) return null;
  return name;
}

function parseColumnType(def: string, colName: string): string {
  const afterName = def.slice(def.indexOf(colName) + colName.length).trim();
  const tokens = afterName.split(/\s+/);
  const typeParts: string[] = [];
  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (
      upper === "NOT" ||
      upper === "NULL" ||
      upper === "PRIMARY" ||
      upper === "KEY" ||
      upper === "UNIQUE" ||
      upper === "DEFAULT" ||
      upper === "REFERENCES" ||
      upper === "CHECK" ||
      upper === "CONSTRAINT" ||
      upper.startsWith("ON")
    ) {
      break;
    }
    typeParts.push(token);
    if (token.includes(")")) break;
  }
  return typeParts.join(" ").replace(/,$/, "") || "unknown";
}

function parseReferences(def: string, colName: string): string | undefined {
  const nameIndex = def.indexOf(colName);
  if (nameIndex < 0) return undefined;
  const afterColumn = def.slice(nameIndex + colName.length);
  const m = REFERENCES_RE.exec(afterColumn);
  if (!m) return undefined;
  const table = m[1] ?? m[2] ?? m[3];
  const col = m[4] ?? m[5] ?? m[6];
  if (!table || !col) return undefined;
  return `${table}.${col}`;
}

function parseForeignKeyConstraint(
  def: string,
): { column: string; ref: string } | null {
  const m = FOREIGN_KEY_RE.exec(def);
  if (!m) return null;
  const column = m[1] ?? m[2] ?? m[3];
  const table = m[4] ?? m[5] ?? m[6];
  const refCol = m[7] ?? m[8] ?? m[9];
  if (!column || !table || !refCol) return null;
  return { column, ref: `${table}.${refCol}` };
}

function parseNullable(def: string): boolean | undefined {
  const upper = def.toUpperCase();
  if (/\bNOT\s+NULL\b/.test(upper)) return false;
  if (/\bNULL\b/.test(upper) && !/\bNOT\s+NULL\b/.test(upper)) return true;
  return undefined;
}

function isPrimaryKeyColumn(def: string): boolean {
  return /\bPRIMARY\s+KEY\b/i.test(def);
}

function humanizeTableName(name: string): string {
  return name.replace(/_/g, " ");
}

function buildRelationships(
  tableName: string,
  columns: SchemaColumn[],
): string[] {
  const rels: string[] = [];
  for (const col of columns) {
    if (!col.references) continue;
    rels.push(`${tableName}.${col.name} → ${col.references}`);
  }
  return rels;
}

function parseTableBody(tableName: string, body: string): SchemaTable {
  const columns: SchemaColumn[] = [];
  const fkByColumn = new Map<string, string>();
  const parts = splitTopLevelCommas(body);

  for (const part of parts) {
    const fk = parseForeignKeyConstraint(part);
    if (fk) {
      fkByColumn.set(fk.column, fk.ref);
      continue;
    }

    if (SKIP_DEF_RE.test(part)) continue;
    if (/^\s*FOREIGN\s+KEY\b/i.test(part)) continue;

    const colName = parseColumnName(part);
    if (!colName) continue;

    const col: SchemaColumn = {
      name: colName,
      type: parseColumnType(part, colName),
      nullable: parseNullable(part),
      references: parseReferences(part, colName),
    };

    if (isPrimaryKeyColumn(part)) {
      col.primaryKey = true;
      col.nullable = false;
    }

    columns.push(col);
  }

  for (const col of columns) {
    const tableFk = fkByColumn.get(col.name);
    if (tableFk && !col.references) {
      col.references = tableFk;
    }
  }

  const relationships = buildRelationships(tableName, columns);

  return {
    name: tableName,
    description: `Table ${humanizeTableName(tableName)} (from uploaded SQL).`,
    relationships: relationships.length > 0 ? relationships : undefined,
    columns,
  };
}

export function parseSqlSchema(sql: string): ParseSqlSchemaResult {
  const cleaned = stripNonTableDdl(sql).trim();
  if (!cleaned) {
    return { ok: false, error: "SQL file is empty." };
  }

  const tables: SchemaTable[] = [];
  const seen = new Set<string>();

  CREATE_TABLE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CREATE_TABLE_RE.exec(cleaned)) !== null) {
    const tableName = match[4] ?? match[5] ?? match[6];
    if (!tableName) continue;

    const openParen = cleaned.indexOf("(", match.index + match[0].length - 1);
    if (openParen < 0) continue;

    const closeParen = findMatchingParen(cleaned, openParen);
    if (closeParen < 0) continue;

    const body = cleaned.slice(openParen + 1, closeParen);
    const key = tableName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    tables.push(parseTableBody(tableName, body));
  }

  if (tables.length === 0) {
    return {
      ok: false,
      error:
        "No CREATE TABLE statements found. Upload a PostgreSQL DDL .sql file.",
    };
  }

  return { ok: true, tables };
}
