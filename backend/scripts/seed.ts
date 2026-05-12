/**
 * Realistic org seed: one `employees` headcount pool; managers, developers,
 * mentors, reporting lines, and HRBP assignments reference those people.
 *
 * Run after: npm run db:migrate
 */
import dotenv from "dotenv";
import { Client } from "pg";
import { getClientConnectionConfig } from "../src/db/pgConnection";

dotenv.config();

/** Total people in `employees` (everyone lives here once). */
const NUM_EMPLOYEES = 2800;
/** Companies to spread people across. */
const NUM_COMPANIES = 96;
/** Rough share of employees who appear in `managers` (people managers). */
const MANAGER_SHARE = 0.11;
/** Target share in `developers` (IC track; overlaps managers who still code). */
const DEVELOPER_TARGET_SHARE = 0.72;
/** Employees designated as HRBP pool (also in employees table). */
const HRBP_POOL_SIZE = 42;
/** Mentorship rows (mentor can have many mentees). */
const NUM_MENTORSHIP_ROWS = 1400;

const industries = [
  "Software",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Logistics",
  "Energy",
  "Education",
  "Media",
  "Telecommunications",
];
const cities = [
  "Austin",
  "Boston",
  "Chicago",
  "Denver",
  "London",
  "Berlin",
  "Toronto",
  "Singapore",
  "Sydney",
  "Tokyo",
  "Dublin",
  "Amsterdam",
];
const departments = [
  "Engineering",
  "Product",
  "Operations",
  "Sales",
  "Customer Success",
  "Support",
  "Finance",
  "People",
];
const languages = [
  "TypeScript",
  "Python",
  "Go",
  "Java",
  "C#",
  "Ruby",
  "Rust",
  "Kotlin",
  "Swift",
];
const levels = ["Junior", "Mid", "Senior", "Staff", "Principal"];
const regions = ["NA", "EMEA", "APAC", "LATAM"];

const FIRST_NAMES = [
  "James",
  "Mary",
  "Robert",
  "Patricia",
  "John",
  "Jennifer",
  "Michael",
  "Linda",
  "David",
  "Elizabeth",
  "William",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Christopher",
  "Karen",
  "Charles",
  "Lisa",
  "Daniel",
  "Nancy",
  "Matthew",
  "Betty",
  "Anthony",
  "Margaret",
  "Mark",
  "Sandra",
  "Donald",
  "Ashley",
  "Steven",
  "Kimberly",
  "Paul",
  "Emily",
  "Andrew",
  "Donna",
  "Joshua",
  "Michelle",
  "Kenneth",
  "Carol",
  "Kevin",
  "Amanda",
  "Brian",
  "Dorothy",
  "George",
  "Melissa",
  "Timothy",
  "Deborah",
  "Ronald",
  "Rebecca",
  "Jason",
  "Sharon",
  "Edward",
  "Laura",
  "Jeffrey",
  "Cynthia",
  "Ryan",
  "Kathleen",
  "Jacob",
  "Amy",
  "Gary",
  "Shirley",
  "Nicholas",
  "Angela",
  "Eric",
  "Helen",
  "Jonathan",
  "Anna",
  "Stephen",
  "Brenda",
  "Larry",
  "Pamela",
  "Justin",
  "Nicole",
  "Scott",
  "Emma",
  "Brandon",
  "Samantha",
  "Benjamin",
  "Katherine",
  "Samuel",
  "Christine",
  "Frank",
  "Debra",
  "Gregory",
  "Rachel",
  "Raymond",
  "Carolyn",
  "Alexander",
  "Janet",
  "Patrick",
  "Catherine",
  "Jack",
  "Maria",
  "Dennis",
  "Heather",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
  "Gomez",
  "Phillips",
  "Evans",
  "Turner",
  "Diaz",
  "Parker",
  "Cruz",
  "Edwards",
  "Collins",
  "Reyes",
  "Stewart",
  "Morris",
  "Morales",
  "Murphy",
  "Cook",
  "Rogers",
  "Gutierrez",
  "Ortiz",
  "Morgan",
  "Cooper",
  "Peterson",
  "Bailey",
  "Reed",
  "Kelly",
  "Howard",
  "Ramos",
  "Kim",
  "Cox",
  "Ward",
  "Richardson",
  "Watson",
  "Brooks",
  "Chavez",
  "Wood",
  "James",
  "Bennett",
  "Gray",
  "Mendoza",
  "Ruiz",
  "Hughes",
  "Price",
  "Alvarez",
  "Castillo",
  "Sanders",
  "Patel",
  "Myers",
  "Long",
  "Ross",
  "Foster",
  "Powell",
  "Jenkins",
  "Perry",
  "Russell",
  "Sullivan",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

function slugPart(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function randYear(i: number): number {
  return 1990 + (i % 32);
}

function hireDate(seed: number): string {
  const y = 2014 + (seed % 11);
  const m = 1 + (seed % 12);
  const d = 1 + (seed % 28);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Deterministic shuffle (Fisher–Yates) with seed for stable re-runs. */
function shuffleInPlace<T>(arr: T[], seed: number): void {
  let s = seed >>> 0;
  const rnd = () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

async function chunkInsert6(
  client: Client,
  rows: unknown[][],
  label: string,
): Promise<void> {
  const CHUNK = 120;
  for (let c = 0; c < rows.length; c += CHUNK) {
    const slice = rows.slice(c, c + CHUNK);
    const ph = slice
      .map(
        (_, row) =>
          `($${row * 6 + 1}, $${row * 6 + 2}, $${row * 6 + 3}, $${row * 6 + 4}, $${row * 6 + 5}, $${row * 6 + 6})`,
      )
      .join(", ");
    await client.query(
      `INSERT INTO employees (company_id, first_name, last_name, email, job_title, hired_at) VALUES ${ph}`,
      slice.flat(),
    );
  }
  console.log(`Inserted ${rows.length} ${label}.`);
}

async function main() {
  const client = new Client(getClientConnectionConfig());
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE TABLE hrbp_assignments, reporting_managers, mentors, developers, managers, employees, companies RESTART IDENTITY CASCADE",
    );

    const companyRows: unknown[][] = [];
    for (let i = 1; i <= NUM_COMPANIES; i++) {
      companyRows.push([
        `${pick(
          [
            "Northwind",
            "Contoso",
            "Fabrikam",
            "Adventure",
            "Globex",
            "Initech",
            "Umbra",
            "Aperture",
          ],
          i,
        )} ${pick(["Labs", "Systems", "Partners", "Holdings", "Digital"], i * 3)} ${i}`,
        pick(industries, i),
        randYear(i),
        pick(cities, i * 7),
      ]);
    }
    const cph = companyRows
      .map(
        (_, row) =>
          `($${row * 4 + 1}, $${row * 4 + 2}, $${row * 4 + 3}, $${row * 4 + 4})`,
      )
      .join(", ");
    await client.query(
      `INSERT INTO companies (name, industry, founded_year, headquarters_city) VALUES ${cph}`,
      companyRows.flat(),
    );

    const employeeRows: unknown[][] = [];
    const companyOfIndex: number[] = [];

    for (let i = 1; i <= NUM_EMPLOYEES; i++) {
      const companyId = 1 + ((i * 31 + 7) % NUM_COMPANIES);
      companyOfIndex.push(companyId);
      const fn = FIRST_NAMES[(i * 17) % FIRST_NAMES.length]!;
      const ln = LAST_NAMES[(i * 13) % LAST_NAMES.length]!;
      const email = `${slugPart(fn)}.${slugPart(ln)}.${i}@c${companyId}.demo`;
      const titlePool = [
        "Software Engineer",
        "Senior Software Engineer",
        "Product Manager",
        "Engineering Manager",
        "Designer",
        "Data Analyst",
        "Sales Representative",
        "Customer Success Manager",
        "HR Generalist",
        "Finance Analyst",
        "Support Engineer",
        "Staff Engineer",
        "Principal Engineer",
        "Director of Engineering",
        "People Business Partner",
        "Technical Program Manager",
      ];
      const job_title = pick(titlePool, i + companyId * 3);
      employeeRows.push([companyId, fn, ln, email, job_title, hireDate(i)]);
    }

    await chunkInsert6(client, employeeRows, "employees");

    const employeeIds = Array.from({ length: NUM_EMPLOYEES }, (_, i) => i + 1);
    const byCompany = new Map<number, number[]>();
    for (let i = 0; i < NUM_EMPLOYEES; i++) {
      const cid = companyOfIndex[i]!;
      if (!byCompany.has(cid)) byCompany.set(cid, []);
      byCompany.get(cid)!.push(i + 1);
    }

    const managerIds = new Set<number>();
    for (const [, ids] of byCompany) {
      const local = [...ids];
      shuffleInPlace(local, 0x9e3779b9);
      const want = Math.max(
        2,
        Math.min(local.length - 1, Math.ceil(local.length * MANAGER_SHARE)),
      );
      for (let k = 0; k < want; k++) managerIds.add(local[k]!);
    }

    const managerIdList = [...managerIds];
    shuffleInPlace(managerIdList, 0xdeadbeef);

    const reportCount = new Map<number, number>();
    for (const m of managerIdList) reportCount.set(m, 0);

    const reportingRows: unknown[][] = [];
    for (let eid = 1; eid <= NUM_EMPLOYEES; eid++) {
      const cid = companyOfIndex[eid - 1]!;
      const pool = managerIdList.filter(
        (m) => m !== eid && companyOfIndex[m - 1] === cid,
      );
      let mgr: number | undefined;
      if (pool.length > 0) {
        mgr = pool[eid % pool.length]!;
      } else {
        const any = managerIdList.filter((m) => m !== eid);
        mgr = any[eid % any.length]!;
      }
      reportingRows.push([eid, mgr, hireDate(eid + 4000)]);
      reportCount.set(mgr, (reportCount.get(mgr) ?? 0) + 1);
    }

    for (let c = 0; c < reportingRows.length; c += 250) {
      const slice = reportingRows.slice(c, c + 250);
      const ph = slice
        .map((_, row) => `($${row * 3 + 1}, $${row * 3 + 2}, $${row * 3 + 3})`)
        .join(", ");
      await client.query(
        `INSERT INTO reporting_managers (employee_id, manager_employee_id, effective_from) VALUES ${ph}`,
        slice.flat(),
      );
    }

    const managerTableRows: unknown[][] = [];
    for (const mid of managerIdList) {
      const team = reportCount.get(mid) ?? 0;
      const padded = Math.max(1, team + (mid % 4));
      managerTableRows.push([mid, padded, pick(departments, mid * 11)]);
    }
    const mPh = managerTableRows
      .map((_, row) => `($${row * 3 + 1}, $${row * 3 + 2}, $${row * 3 + 3})`)
      .join(", ");
    await client.query(
      `INSERT INTO managers (employee_id, team_size, department) VALUES ${mPh}`,
      managerTableRows.flat(),
    );

    const devSet = new Set<number>(managerIdList);
    const targetDev = Math.floor(NUM_EMPLOYEES * DEVELOPER_TARGET_SHARE);
    let s = 0xabc123;
    const rnd = () => {
      s = (Math.imul(1103515245, s) + 12345) >>> 0;
      return s / 0xffffffff;
    };
    for (let eid = 1; eid <= NUM_EMPLOYEES && devSet.size < targetDev; eid++) {
      if (!devSet.has(eid) && rnd() < 0.55) devSet.add(eid);
    }
    for (let eid = 1; eid <= NUM_EMPLOYEES && devSet.size < targetDev; eid++) {
      devSet.add(eid);
    }

    const devRows: unknown[][] = [];
    for (const eid of devSet) {
      devRows.push([eid, pick(languages, eid), pick(levels, eid * 3)]);
    }
    shuffleInPlace(devRows, 0xfeed);
    for (let c = 0; c < devRows.length; c += 200) {
      const slice = devRows.slice(c, c + 200);
      const ph = slice
        .map((_, row) => `($${row * 3 + 1}, $${row * 3 + 2}, $${row * 3 + 3})`)
        .join(", ");
      await client.query(
        `INSERT INTO developers (employee_id, primary_language, level) VALUES ${ph}`,
        slice.flat(),
      );
    }

    const mentorCandidates: number[] = [...managerIdList];
    const extraMentors = employeeIds.filter(
      (id) =>
        !managerIds.has(id) &&
        devSet.has(id) &&
        (id % 11 === 0 || id % 19 === 0),
    );
    shuffleInPlace(extraMentors, 0x600d);
    for (const id of extraMentors.slice(0, 95)) mentorCandidates.push(id);
    shuffleInPlace(mentorCandidates, 0x0d10d010);

    const mentorRows: unknown[][] = [];
    const seenPairs = new Set<string>();
    const allButMentor = (exclude: number) =>
      employeeIds.filter((id) => id !== exclude);

    for (let k = 0; k < NUM_MENTORSHIP_ROWS; k++) {
      const mentorId = mentorCandidates[k % mentorCandidates.length]!;
      let menteePool = (
        byCompany.get(companyOfIndex[mentorId - 1]!) ?? []
      ).filter((id) => id !== mentorId);
      if (menteePool.length < 4) {
        menteePool = allButMentor(mentorId);
      }
      let placed = false;
      for (let hop = 0; hop < menteePool.length && !placed; hop++) {
        const menteeId = menteePool[(k + hop * 13) % menteePool.length]!;
        const key = `${mentorId}:${menteeId}`;
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        mentorRows.push([mentorId, menteeId, hireDate(8000 + k)]);
        placed = true;
      }
    }
    for (let c = 0; c < mentorRows.length; c += 250) {
      const slice = mentorRows.slice(c, c + 250);
      const ph = slice
        .map((_, row) => `($${row * 3 + 1}, $${row * 3 + 2}, $${row * 3 + 3})`)
        .join(", ");
      await client.query(
        `INSERT INTO mentors (mentor_employee_id, mentee_employee_id, since_date) VALUES ${ph}`,
        slice.flat(),
      );
    }

    const hrbpPool: number[] = [];
    const nonMgr = employeeIds.filter((id) => !managerIds.has(id));
    shuffleInPlace(nonMgr, 0x4812b500);
    for (let i = 0; i < HRBP_POOL_SIZE && i < nonMgr.length; i++) {
      hrbpPool.push(nonMgr[i]!);
    }
    if (hrbpPool.length < 8) {
      for (const id of employeeIds) {
        if (hrbpPool.length >= HRBP_POOL_SIZE) break;
        if (!hrbpPool.includes(id)) hrbpPool.push(id);
      }
    }

    const hrbpRows: unknown[][] = [];
    for (let eid = 1; eid <= NUM_EMPLOYEES; eid++) {
      const cid = companyOfIndex[eid - 1]!;
      const sameCo = hrbpPool.filter(
        (h) => h !== eid && companyOfIndex[h - 1] === cid,
      );
      const pool =
        sameCo.length > 0 ? sameCo : hrbpPool.filter((h) => h !== eid);
      const hrbpId = pool[eid % pool.length]!;
      hrbpRows.push([eid, hrbpId, pick(regions, cid + eid)]);
    }
    for (let c = 0; c < hrbpRows.length; c += 250) {
      const slice = hrbpRows.slice(c, c + 250);
      const ph = slice
        .map((_, row) => `($${row * 3 + 1}, $${row * 3 + 2}, $${row * 3 + 3})`)
        .join(", ");
      await client.query(
        `INSERT INTO hrbp_assignments (employee_id, hrbp_employee_id, region) VALUES ${ph}`,
        slice.flat(),
      );
    }

    await client.query("COMMIT");
    console.log(
      [
        "Seed complete.",
        `  companies: ${NUM_COMPANIES}`,
        `  employees: ${NUM_EMPLOYEES} (single headcount pool)`,
        `  managers: ${managerIdList.length} (people managers; team_size ≈ direct reports + small noise)`,
        `  developers: ${devSet.size} (overlaps managers where applicable)`,
        `  reporting_managers: ${reportingRows.length} (each employee → manager, same company when possible)`,
        `  mentors: ${mentorRows.length} (many mentees per mentor; managers often mentors)`,
        `  hrbp_assignments: ${hrbpRows.length} (pool of ${hrbpPool.length} HRBPs)`,
      ].join("\n"),
    );
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
