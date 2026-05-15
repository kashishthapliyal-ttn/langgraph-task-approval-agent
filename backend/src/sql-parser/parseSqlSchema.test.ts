import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSqlSchema } from "./parseSqlSchema";

const migrationSql = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../db/migrations/001_schema.sql",
  ),
  "utf8",
);

function columnsWithFk(
  tables: { columns: { name: string; references?: string }[] }[],
) {
  return tables.flatMap((t) =>
    t.columns
      .filter((c) => c.references)
      .map((c) => `${c.name}:${c.references}`),
  );
}

describe("parseSqlSchema", () => {
  it("parses tables from migration DDL", () => {
    const result = parseSqlSchema(migrationSql);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const names = result.tables.map((t) => t.name).sort();
    expect(names).toEqual([
      "companies",
      "developers",
      "employees",
      "hrbp_assignments",
      "managers",
      "mentors",
      "reporting_managers",
    ]);
  });

  it("extracts foreign keys only on referencing columns", () => {
    const result = parseSqlSchema(migrationSql);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const companies = result.tables.find((t) => t.name === "companies");
    expect(companies?.columns.every((c) => !c.references)).toBe(true);

    const employees = result.tables.find((t) => t.name === "employees");
    const companyId = employees?.columns.find((c) => c.name === "company_id");
    expect(companyId?.references).toBe("companies.id");
    expect(companyId?.nullable).toBe(false);

    const fkCount = columnsWithFk(result.tables).length;
    expect(fkCount).toBe(9);
  });

  it("ignores CREATE INDEX statements", () => {
    const result = parseSqlSchema(migrationSql);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const table of result.tables) {
      expect(table.columns.some((c) => c.name === "CREATE")).toBe(false);
      expect(table.columns.some((c) => c.name === "INDEX")).toBe(false);
      expect(table.columns.some((c) => c.name === "ON")).toBe(false);
    }
  });

  it("does not attach REFERENCES from later columns in the same fragment", () => {
    const sql = `
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers (id)
      );
      CREATE TABLE customers (id SERIAL PRIMARY KEY);
    `;
    const result = parseSqlSchema(sql);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const orders = result.tables.find((t) => t.name === "orders");
    const id = orders?.columns.find((c) => c.name === "id");
    const customerId = orders?.columns.find((c) => c.name === "customer_id");
    expect(id?.references).toBeUndefined();
    expect(customerId?.references).toBe("customers.id");
  });

  it("parses table-level FOREIGN KEY constraints", () => {
    const sql = `
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        CONSTRAINT orders_customer_fk FOREIGN KEY (customer_id) REFERENCES customers (id)
      );
      CREATE TABLE customers (
        id SERIAL PRIMARY KEY
      );
    `;
    const result = parseSqlSchema(sql);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const orders = result.tables.find((t) => t.name === "orders");
    const customerId = orders?.columns.find((c) => c.name === "customer_id");
    expect(customerId?.references).toBe("customers.id");
  });

  it("rejects empty SQL", () => {
    const result = parseSqlSchema("  ");
    expect(result.ok).toBe(false);
  });
});
