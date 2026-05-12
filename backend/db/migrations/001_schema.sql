CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(120) NOT NULL,
  founded_year INTEGER NOT NULL,
  headquarters_city VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  job_title VARCHAR(160) NOT NULL,
  hired_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees (company_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees (email);

CREATE TABLE IF NOT EXISTS managers (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL UNIQUE REFERENCES employees (id) ON DELETE CASCADE,
  team_size INTEGER NOT NULL DEFAULT 0,
  department VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_managers_employee_id ON managers (employee_id);

CREATE TABLE IF NOT EXISTS developers (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL UNIQUE REFERENCES employees (id) ON DELETE CASCADE,
  primary_language VARCHAR(80) NOT NULL,
  level VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_developers_employee_id ON developers (employee_id);

CREATE TABLE IF NOT EXISTS mentors (
  id SERIAL PRIMARY KEY,
  mentor_employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  mentee_employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  since_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mentors_no_self CHECK (mentor_employee_id <> mentee_employee_id)
);

CREATE INDEX IF NOT EXISTS idx_mentors_mentor ON mentors (mentor_employee_id);
CREATE INDEX IF NOT EXISTS idx_mentors_mentee ON mentors (mentee_employee_id);

CREATE TABLE IF NOT EXISTS reporting_managers (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  manager_employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reporting_no_self CHECK (employee_id <> manager_employee_id)
);

CREATE INDEX IF NOT EXISTS idx_reporting_employee ON reporting_managers (employee_id);
CREATE INDEX IF NOT EXISTS idx_reporting_manager ON reporting_managers (manager_employee_id);

CREATE TABLE IF NOT EXISTS hrbp_assignments (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  hrbp_employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  region VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hrbp_no_self CHECK (employee_id <> hrbp_employee_id)
);

CREATE INDEX IF NOT EXISTS idx_hrbp_employee ON hrbp_assignments (employee_id);
CREATE INDEX IF NOT EXISTS idx_hrbp_hrbp ON hrbp_assignments (hrbp_employee_id);
