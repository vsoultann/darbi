/** Module-level handle on the running DemoEngine, so Settings can reset it directly. */
import type { DemoEngine } from './DemoEngine';

let active: DemoEngine | null = null;

export function setActiveEngine(engine: DemoEngine | null): void {
  active = engine;
}

export function getActiveEngine(): DemoEngine | null {
  return active;
}

export function resetActiveEngine(): void {
  active?.reset();
}
