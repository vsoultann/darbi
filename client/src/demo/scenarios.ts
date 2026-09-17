/** Scenario catalogue for the UI — the scripts themselves are shared with the server. */
import { SCENARIOS, SCENARIO_IDS, type Scenario, type ScenarioId } from '@shared/scenarios';

export { SCENARIOS, SCENARIO_IDS };
export type { Scenario, ScenarioId };

export const SCENARIO_LIST: Scenario[] = SCENARIO_IDS.map((id) => SCENARIOS[id]);

export const SPEED_CHOICES = [1, 2, 5, 10] as const;
export const ADMIN_SPEED_CHOICES = [0.5, 1, 2, 5, 10, 30] as const;
export const ETA_CHIPS: Array<{ label: string; seconds: number }> = [
  { label: '30s', seconds: 30 },
  { label: '2m', seconds: 120 },
  { label: '5m', seconds: 300 },
  { label: '12m', seconds: 720 },
  { label: '25m', seconds: 1500 },
];
