import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from 'better-sqlite3';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Applies schema.sql. Every statement is CREATE ... IF NOT EXISTS, so this is idempotent. */
export function migrate(db: Database): void {
  const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  db.exec(sql);
}
