import type { FrameAnalysis, RiskLevel } from './types';

export interface RiskResult {
  riskLevel: RiskLevel;
  compositeScore: number;
}

/**
 * Calculate composite risk score from frame analysis signals.
 *
 * Weighted scoring:
 *   - nsfw_score:          weight 0.50 (highest — content safety)
 *   - human_present inverted: weight 0.20 (no human = suspicious)
 *   - bot_score:           weight 0.15 (bot/static indicators)
 *   - unexpected faces:    weight 0.10 (>2 faces is unusual for 1-on-1)
 *   - objectionable objects: weight 0.05 (placeholder for future ML model)
 *
 * Thresholds:
 *   0.00 – 0.15  → none
 *   0.15 – 0.35  → low
 *   0.35 – 0.60  → medium
 *   0.60 – 0.80  → high
 *   0.80 – 1.00  → critical
 */
export function calculateRisk(analysis: FrameAnalysis): RiskResult {
  let compositeScore = 0;

  // NSFW content — highest weight
  compositeScore += analysis.nsfw_score * 0.50;

  // No human present — suspicious (could be a bot, static image, or empty frame)
  compositeScore += (analysis.human_present ? 0 : 1.0) * 0.20;

  // Bot/static indicators
  compositeScore += analysis.bot_score * 0.15;

  // Unexpected multiple faces (>2 is unusual for a 1-on-1 video chat)
  compositeScore += (analysis.face_count > 2 ? 1.0 : 0) * 0.10;

  // Placeholder for objectionable objects detection
  compositeScore += 0.0 * 0.05;

  let riskLevel: RiskLevel;
  if (compositeScore >= 0.8) riskLevel = 'critical';
  else if (compositeScore >= 0.6) riskLevel = 'high';
  else if (compositeScore >= 0.35) riskLevel = 'medium';
  else if (compositeScore >= 0.15) riskLevel = 'low';
  else riskLevel = 'none';

  return { riskLevel, compositeScore };
}
