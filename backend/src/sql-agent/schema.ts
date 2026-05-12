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

export const SCHEMA_TABLES: SchemaTable[] = [
  {
    name: "companies",
    description:
      "Legal employers in the dataset. Each company has many employees; industries and HQ city support filtering and grouping.",
    relationships: [
      "One company → many employees via employees.company_id.",
      "Join companies when you need industry, founded_year, or headquarters_city alongside people.",
    ],
    columns: [
      {
        name: "id",
        type: "serial",
        nullable: false,
        description: "Primary key; referenced by employees.company_id.",
      },
      {
        name: "name",
        type: "varchar(255)",
        nullable: false,
        description: "Company display name (e.g. branded operating units).",
      },
      {
        name: "industry",
        type: "varchar(120)",
        nullable: false,
        description: "Sector label (Software, Finance, Healthcare, …).",
      },
      {
        name: "founded_year",
        type: "integer",
        nullable: false,
        description: "Calendar year the organization was founded.",
      },
      {
        name: "headquarters_city",
        type: "varchar(120)",
        nullable: false,
        description: "Primary HQ city name for geographic queries.",
      },
      {
        name: "created_at",
        type: "timestamptz",
        nullable: false,
        description: "Row insert time (audit).",
      },
    ],
  },
  {
    name: "employees",
    description:
      "Single headcount table: every person appears once. Job title and email are realistic; join managers, developers, mentors, reporting_managers, and hrbp_assignments for org context.",
    relationships: [
      "employees.company_id → companies.id (required).",
      "managers.employee_id, developers.employee_id are subsets of employees (role/extension rows).",
      "reporting_managers.employee_id / manager_employee_id, mentors.*, hrbp_assignments.* all reference employees.id.",
    ],
    columns: [
      {
        name: "id",
        type: "serial",
        nullable: false,
        description: "Primary key for every person in the database.",
      },
      {
        name: "company_id",
        type: "integer",
        nullable: false,
        references: "companies.id",
        description: "Employer; use for same-company joins and org rollups.",
      },
      {
        name: "first_name",
        type: "varchar(80)",
        nullable: false,
        description: "Given name (seed uses realistic name pools).",
      },
      {
        name: "last_name",
        type: "varchar(80)",
        nullable: false,
        description: "Family name.",
      },
      {
        name: "email",
        type: "varchar(255)",
        nullable: false,
        description:
          "Unique work email; pattern like firstname.lastname.{id}@c{company_id}.demo in seeded data.",
      },
      {
        name: "job_title",
        type: "varchar(160)",
        nullable: false,
        description:
          "Role label (engineer, manager, HR, sales, …); overlaps conceptually with managers/developers tables.",
      },
      {
        name: "hired_at",
        type: "date",
        nullable: false,
        description: "Start date at the company (tenure / cohort queries).",
      },
      {
        name: "created_at",
        type: "timestamptz",
        nullable: false,
        description: "Row insert time (audit).",
      },
    ],
  },
  {
    name: "managers",
    description:
      "People managers: one row per employee who formally manages others. Often overlaps with developers (engineering managers). team_size is indicative of span of control in seed data.",
    relationships: [
      "managers.employee_id → employees.id (UNIQUE: at most one manager row per person).",
      "In realistic seeds, reporting_managers.manager_employee_id usually points at employees who also have a managers row.",
    ],
    columns: [
      {
        name: "id",
        type: "serial",
        nullable: false,
        description: "Surrogate key for the manager assignment row.",
      },
      {
        name: "employee_id",
        type: "integer",
        nullable: false,
        references: "employees.id",
        description: "Which employee is a people manager.",
      },
      {
        name: "team_size",
        type: "integer",
        nullable: false,
        description:
          "Approximate direct/indirect span (seeded; correlate with COUNT from reporting_managers).",
      },
      {
        name: "department",
        type: "varchar(120)",
        nullable: false,
        description: "Owning department (Engineering, Product, Sales, …).",
      },
      {
        name: "created_at",
        type: "timestamptz",
        nullable: false,
        description: "Row insert time (audit).",
      },
    ],
  },
  {
    name: "developers",
    description:
      "IC/engineering track: one row per employee who is modeled as an individual contributor developer (language + level). Managers who code often appear here too.",
    relationships: [
      "developers.employee_id → employees.id (UNIQUE).",
      "Join employees + companies for org context; join mentors on employee ids for growth relationships.",
    ],
    columns: [
      {
        name: "id",
        type: "serial",
        nullable: false,
        description: "Surrogate key for the developer profile row.",
      },
      {
        name: "employee_id",
        type: "integer",
        nullable: false,
        references: "employees.id",
        description: "Employee on the developer ladder.",
      },
      {
        name: "primary_language",
        type: "varchar(80)",
        nullable: false,
        description: "Main language (TypeScript, Python, Go, …).",
      },
      {
        name: "level",
        type: "varchar(40)",
        nullable: false,
        description: "Seniority band (Junior, Mid, Senior, Staff, Principal).",
      },
      {
        name: "created_at",
        type: "timestamptz",
        nullable: false,
        description: "Row insert time (audit).",
      },
    ],
  },
  {
    name: "mentors",
    description:
      "Mentorship edges: one row per mentor–mentee pair. A mentor (often a manager) can have many mentees; a mentee can appear in multiple rows (different mentors over time or concurrent programs in seed).",
    relationships: [
      "mentor_employee_id and mentee_employee_id → employees.id; CHECK prevents self-mentorship.",
      "High fan-out on mentor_employee_id is expected in seeded data.",
    ],
    columns: [
      {
        name: "id",
        type: "serial",
        nullable: false,
        description: "Surrogate key for the mentorship row.",
      },
      {
        name: "mentor_employee_id",
        type: "integer",
        nullable: false,
        references: "employees.id",
        description: "Senior / mentor side of the relationship.",
      },
      {
        name: "mentee_employee_id",
        type: "integer",
        nullable: false,
        references: "employees.id",
        description:
          "Junior / mentee side; must differ from mentor_employee_id.",
      },
      {
        name: "since_date",
        type: "date",
        nullable: false,
        description: "When the mentorship pairing started.",
      },
      {
        name: "created_at",
        type: "timestamptz",
        nullable: false,
        description: "Row insert time (audit).",
      },
    ],
  },
  {
    name: "reporting_managers",
    description:
      "Line reporting: each row says which employee reports to which manager employee (by employee id). Seeded so people usually report within the same company; manager is typically also in managers.",
    relationships: [
      "employee_id → employees.id (the report).",
      "manager_employee_id → employees.id (the line manager); CHECK prevents self-reporting.",
      "Use COUNT(*) GROUP BY manager_employee_id for team sizes; join managers on manager_employee_id = managers.employee_id for department.",
    ],
    columns: [
      {
        name: "id",
        type: "serial",
        nullable: false,
        description: "Surrogate key for the reporting line row.",
      },
      {
        name: "employee_id",
        type: "integer",
        nullable: false,
        references: "employees.id",
        description: "Subordinate employee in the reporting relationship.",
      },
      {
        name: "manager_employee_id",
        type: "integer",
        nullable: false,
        references: "employees.id",
        description: "Manager’s employee id (line manager).",
      },
      {
        name: "effective_from",
        type: "date",
        nullable: false,
        description: "When this reporting line became effective.",
      },
      {
        name: "created_at",
        type: "timestamptz",
        nullable: false,
        description: "Row insert time (audit).",
      },
    ],
  },
  {
    name: "hrbp_assignments",
    description:
      "HR business partner coverage: each employee is assigned an HRBP (another employee id) and a region bucket (NA, EMEA, APAC, LATAM). Seeded with a dedicated HRBP pool; assignments prefer same company when possible.",
    relationships: [
      "employee_id and hrbp_employee_id → employees.id; CHECK prevents self-assignment.",
      "Use for “who is my HRBP?” and regional HR rollups.",
    ],
    columns: [
      {
        name: "id",
        type: "serial",
        nullable: false,
        description: "Surrogate key for the HRBP assignment row.",
      },
      {
        name: "employee_id",
        type: "integer",
        nullable: false,
        references: "employees.id",
        description: "Employee receiving HRBP support.",
      },
      {
        name: "hrbp_employee_id",
        type: "integer",
        nullable: false,
        references: "employees.id",
        description: "Employee acting as HR business partner.",
      },
      {
        name: "region",
        type: "varchar(80)",
        nullable: false,
        description: "HR region code for routing and reporting.",
      },
      {
        name: "created_at",
        type: "timestamptz",
        nullable: false,
        description: "Row insert time (audit).",
      },
    ],
  },
];

function columnLine(c: SchemaColumn): string {
  let nullStr = "";
  if (c.nullable === false) nullStr = " NOT NULL";
  else if (c.nullable === true) nullStr = " NULL";
  const ref = c.references ? ` FK→${c.references}` : "";
  const desc = c.description ? ` — ${c.description}` : "";
  return `  - ${c.name} (${c.type}${nullStr})${ref}${desc}`;
}

export const SCHEMA_FOR_LLM = [
  "You may ONLY query these PostgreSQL tables with SELECT (read-only).",
  "Schema: public. Use table names exactly as listed.",
  "Prefer explicit column lists; qualify columns with table aliases on joins.",
  "Do not use SQL comments or multiple statements separated by semicolons.",
  "",
  ...SCHEMA_TABLES.map((t) => {
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
