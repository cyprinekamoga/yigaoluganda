/** Daily goal: how many lessons or practice rounds a day the learner aims for. */
export const GOALS = [1, 2, 3] as const;
export const DEFAULT_GOAL = 1;

/** A goal that is one of the choices (older or odd values fall back to the default). */
export function goalOf(value: unknown): number {
  return GOALS.includes(value as 1 | 2 | 3) ? (value as number) : DEFAULT_GOAL;
}

/** After a round is counted: true only for the round that reaches the goal, not the ones after. */
export function goalJustReached(countToday: number, goal: unknown): boolean {
  return countToday === goalOf(goal);
}

/** Today's progress towards the goal, from 0 to 1. */
export function goalProgress(countToday: number, goal: unknown): number {
  return Math.min(1, countToday / goalOf(goal));
}
