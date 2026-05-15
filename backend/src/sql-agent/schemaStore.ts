import { randomUUID } from "node:crypto";
import type { SchemaTable } from "./schemaTypes";

function cloneTables(tables: SchemaTable[]): SchemaTable[] {
  return JSON.parse(JSON.stringify(tables)) as SchemaTable[];
}

const TTL_MS = 60 * 60 * 1000;

type Entry = {
  tables: SchemaTable[];
  expiresAt: number;
};

const store = new Map<string, Entry>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }
}

export function saveSchemaTables(tables: SchemaTable[]): string {
  pruneExpired();
  const schemaId = randomUUID();
  store.set(schemaId, {
    tables: cloneTables(tables),
    expiresAt: Date.now() + TTL_MS,
  });
  return schemaId;
}

export function getSchemaTables(schemaId: string): SchemaTable[] | null {
  pruneExpired();
  const entry = store.get(schemaId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(schemaId);
    return null;
  }
  return cloneTables(entry.tables);
}

export { cloneTables };
