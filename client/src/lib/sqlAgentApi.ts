const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type SchemaColumn = {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
  references?: string;
};

export type SchemaTable = {
  name: string;
  description: string;
  relationships?: string[];
  columns: SchemaColumn[];
};

export type SchemaResponse = {
  status: "ok";
  data: { tables: SchemaTable[] };
};

export type GenerateOkData = {
  sql: string;
  rationale?: string;
};

export type ExecuteOkData = {
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  maxRows: number;
};

export type QuerySuccessData = ExecuteOkData & {
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

export type ExecuteResponse =
  | { status: "ok"; data: ExecuteOkData }
  | {
      status: "error";
      error: string;
      details?: unknown;
      generatedSql?: string;
    };

export type QueryResponse =
  | { status: "ok"; data: QuerySuccessData }
  | {
      status: "error";
      error: string;
      details?: unknown;
      generatedSql?: string;
    };

export async function fetchSchema(): Promise<SchemaTable[]> {
  const res = await fetch(`${BASE}/meta/schema`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Schema request failed: ${res.status}`);
  const body = (await res.json()) as SchemaResponse;
  if (body.status !== "ok") throw new Error("Invalid schema response");
  return body.data.tables;
}

async function parseJsonBody(res: Response): Promise<Record<string, unknown>> {
  return res.json() as Promise<Record<string, unknown>>;
}

export async function generateSqlAgentQuery(
  question: string,
  init?: { signal?: AbortSignal },
): Promise<GenerateResponse> {
  const res = await fetch(`${BASE}/sql-agent/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
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
    error: (body.error as string) ?? `Request failed (${res.status})`,
    details: body.details,
    generatedSql: body.generatedSql,
  };
}

export async function executeSqlAgentQuery(
  sql: string,
  init?: { signal?: AbortSignal },
): Promise<ExecuteResponse> {
  const res = await fetch(`${BASE}/sql-agent/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
    signal: init?.signal,
  });

  const body = (await parseJsonBody(res)) as {
    status?: string;
    data?: ExecuteOkData;
    error?: string;
    details?: unknown;
    generatedSql?: string;
  };

  if (body.status === "ok" && body.data) {
    return { status: "ok", data: body.data };
  }

  return {
    status: "error",
    error: (body.error as string) ?? `Request failed (${res.status})`,
    details: body.details,
    generatedSql: body.generatedSql,
  };
}

export async function runSqlAgentQuery(
  question: string,
  init?: { signal?: AbortSignal },
): Promise<QueryResponse> {
  const res = await fetch(`${BASE}/sql-agent/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal: init?.signal,
  });

  const body = (await parseJsonBody(res)) as {
    status?: string;
    data?: QuerySuccessData;
    error?: string;
    details?: unknown;
    generatedSql?: string;
  };

  if (body.status === "ok" && body.data) {
    return { status: "ok", data: body.data };
  }

  return {
    status: "error",
    error: (body.error as string) ?? `Request failed (${res.status})`,
    details: body.details,
    generatedSql: body.generatedSql,
  };
}
