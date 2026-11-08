import { createEliminationRunner } from './elimination-director';
import type { ModeRunner, RunnerContext } from './hosted-mode';

/**
 * Modes built next to the exam mode (which the host builds itself, because tests and weekly scores use it).
 * Add a factory here when a new mode exists.
 */
export const extraRunners: ((ctx: RunnerContext) => ModeRunner)[] = [createEliminationRunner];
