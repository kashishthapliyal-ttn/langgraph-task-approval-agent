const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type SchemaColumn = {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
  primaryKey?: boolean;
  references?: string;
};

export type SchemaTable = {
  name: string;
  description: string;
  relationships?: string[];
  columns: SchemaColumn[];
};

export type ParseSchemaResponse =
  | { status: "ok"; data: { schemaId: string; tables: SchemaTable[] } }
  | { status: "error"; error: string; details?: unknown };

export type GenerateOkData = {
  sql: string;
  rationale?: string;
};

export type GenerateResponse =
  | { status: "ok"; data: GenerateOkData }
  | {
      status: "error";
      error: string;
      details?: unknown;
      generatedSql?: string;
    };

async function parseJsonBody(res: Response): Promise<Record<string, unknown>> {
  return res.json() as Promise<Record<string, unknown>>;
}

function formatApiError(body: Record<string, unknown>, status: number): string {
  const base = (body.error as string) ?? `Request failed (${status})`;
  const details = body.details as
    | { fieldErrors?: Record<string, string[]> }
    | undefined;
  if (details?.fieldErrors) {
    const fields = Object.entries(details.fieldErrors)
      .flatMap(([k, msgs]) => msgs.map((m) => `${k}: ${m}`))
      .join("; ");
    if (fields) return `${base} (${fields})`;
  }
  return base;
}

export async function parseSqlSchema(
  sql: string,
  init?: { signal?: AbortSignal },
): Promise<ParseSchemaResponse> {
  const res = await fetch(`${BASE}/schema/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
    signal: init?.signal,
  });

  const body = (await parseJsonBody(res)) as {
    status?: string;
    data?: { schemaId: string; tables: SchemaTable[] };
    error?: string;
    details?: unknown;
  };

  if (body.status === "ok" && body.data?.tables && body.data.schemaId) {
    return {
      status: "ok",
      data: { schemaId: body.data.schemaId, tables: body.data.tables },
    };
  }

  return {
    status: "error",
    error: formatApiError(body, res.status),
    details: body.details,
  };
}

export async function generateSqlAgentQuery(
  question: string,
  schemaId: string,
  init?: { signal?: AbortSignal },
): Promise<GenerateResponse> {
  const res = await fetch(`${BASE}/sql-agent/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, schemaId }),
    signal: init?.signal,
  });

  const body = (await parseJsonBody(res)) as {
    status?: string;
    data?: GenerateOkData;
    error?: string;
    details?: unknown;
    generatedSql?: string;
  };

  if (body.status === "ok" && body.data) {
    return { status: "ok", data: body.data };
  }

  return {
    status: "error",
    error: formatApiError(body, res.status),
    details: body.details,
    generatedSql: body.generatedSql,
  };
}
