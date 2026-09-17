#!/usr/bin/env node
/** Regenerates client/src/demo/fallbackPayload.ts from a running dev server. */
import { writeFileSync } from 'node:fs';

const base = process.env.DARBI_URL ?? 'http://localhost:5174';
const response = await fetch(`${base}/api/students/123456`);
if (!response.ok) {
  console.error(`[darbi] ${base} did not return the demo student — is the server running?`);
  process.exit(1);
}
const payload = await response.json();
payload.trip.simulated = true;

const file = `/**
 * A frozen snapshot of Khalid's tracking payload, generated from the seeded database.
 *
 * It exists so Demo Mode is genuinely offline-capable: if the API cannot be reached
 * (a static host, a dead venue network, the \`demo-only\` build in §14) the whole
 * experience still runs from this file plus the client-side DemoEngine.
 *
 * Regenerate with: npm run seed && node scripts/snapshot-demo.mjs
 */
import type { TrackPayload } from '@shared/types';

export const FALLBACK_PAYLOAD: TrackPayload = ${JSON.stringify(payload, null, 2)} as TrackPayload;

export function fallbackPayloadFor(studentNo: string): TrackPayload | null {
  return studentNo === FALLBACK_PAYLOAD.student.student_no ? FALLBACK_PAYLOAD : null;
}
`;

writeFileSync(new URL('../client/src/demo/fallbackPayload.ts', import.meta.url), file);
console.log('[darbi] fallback payload written');
