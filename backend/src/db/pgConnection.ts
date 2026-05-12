import type { ClientConfig, PoolConfig } from "pg";
import { env } from "../utils/env";

function baseConnection(): Pick<
  ClientConfig,
  "host" | "port" | "user" | "password" | "database" | "ssl"
> {
  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: env.DB_SSL ? true : undefined,
  };
}

export function getClientConnectionConfig(): ClientConfig {
  return baseConnection();
}

export function getPoolConfig(): PoolConfig {
  return {
    ...baseConnection(),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}
