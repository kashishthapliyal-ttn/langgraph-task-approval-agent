import { Pool } from "pg";
import { getPoolConfig } from "./pgConnection";

export const pool = new Pool(getPoolConfig());
