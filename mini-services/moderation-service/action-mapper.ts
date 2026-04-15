import type { RiskLevel, ModerationAction } from './types';

/**
 * Map a risk level and consecutive violation count to a recommended moderation action.
 *
 * Rules:
 *   - critical  → blacklist (immediate)
 *   - high      → terminate (kill session)
 *   - medium with ≥2 consecutive violations → terminate
 *   - medium    → warn (show warning overlay)
 *   - low       → allow (log event)
 *   - none      → allow
 *   - ≥3 consecutive violations of any kind → blacklist
 */
export function mapAction(riskLevel: RiskLevel, consecutiveViolations: number): ModerationAction {
  if (riskLevel === 'critical' || consecutiveViolations >= 3) return 'blacklist';
  if (riskLevel === 'high') return 'terminate';
  if (riskLevel === 'medium' && consecutiveViolations >= 2) return 'terminate';
  if (riskLevel === 'medium') return 'warn';
  if (riskLevel === 'low') return 'allow';
  return 'allow';
}

/**
 * Determine if the risk level is high enough to trigger a kill-switch.
 * Kill-switch triggers on 'high' or 'critical' risk levels.
 */
export function isHighRisk(riskLevel: RiskLevel): boolean {
  return riskLevel === 'high' || riskLevel === 'critical';
}
