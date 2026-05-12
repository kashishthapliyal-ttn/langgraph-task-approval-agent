import { describe, expect, it } from "vitest";
import {
  stripSqlFences,
  validateReadonlySql,
  wrapSelectWithRowLimit,
} from "./validateSql";

describe("stripSqlFences", () => {
  it("strips sql markdown fences", () => {
    expect(stripSqlFences("```sql\nSELECT 1\n```")).toBe("SELECT 1");
    expect(stripSqlFences("```\nSELECT 1\n```")).toBe("SELECT 1");
  });
});

describe("validateReadonlySql", () => {
  it("accepts a simple select", () => {
    const r = validateReadonlySql("SELECT id FROM employees LIMIT 10");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.sql).toContain("employees");
  });

  it("accepts select with leading paren", () => {
    const r = validateReadonlySql("(SELECT 1 AS x)");
    expect(r.ok).toBe(true);
  });

  it("rejects empty", () => {
    const r = validateReadonlySql("   ");
    expect(r.ok).toBe(false);
  });

  it("rejects comments", () => {
    expect(validateReadonlySql("SELECT 1 -- hack").ok).toBe(false);
    expect(validateReadonlySql("SELECT 1 /* x */").ok).toBe(false);
  });

  it("rejects multiple statements", () => {
    const r = validateReadonlySql("SELECT 1; SELECT 2");
    expect(r.ok).toBe(false);
  });

  it("rejects DROP", () => {
    const r = validateReadonlySql("SELECT 1; DROP TABLE employees");
    expect(r.ok).toBe(false);
  });

  it("rejects INSERT", () => {
    expect(validateReadonlySql("INSERT INTO employees VALUES (1)").ok).toBe(
      false,
    );
  });

  it("rejects non-select", () => {
    expect(validateReadonlySql("UPDATE employees SET id = 1").ok).toBe(false);
  });
});

describe("wrapSelectWithRowLimit", () => {
  it("wraps inner select", () => {
    const w = wrapSelectWithRowLimit("SELECT 1 AS a");
    expect(w).toContain("SELECT * FROM (");
    expect(w).toContain("LIMIT 500");
  });
});
