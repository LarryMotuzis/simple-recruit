/**
 * Pure metric calculations. No DB access — kept dependency-free so they're
 * trivial to unit test, and so metrics are always computed fresh rather than
 * stored (avoiding stale denormalized values).
 */

export interface BoxScoreStat {
  points?: number;
  rebounds?: number;
  assists?: number;
  fg_made?: number;
  fg_attempted?: number;
}

export interface RatingPoint {
  eval_date: string;
  rating: number;
}

/**
 * A simple basketball efficiency score (a common box-score formula):
 *   (points + rebounds + assists) - missed field goals
 * Missed FG = fg_attempted - fg_made.
 */
export function efficiency(stat: BoxScoreStat): number {
  const missed = (stat.fg_attempted ?? 0) - (stat.fg_made ?? 0);
  return (stat.points ?? 0) + (stat.rebounds ?? 0) + (stat.assists ?? 0) - missed;
}

/** Field-goal percentage, 0–100, rounded to one decimal. Guards divide-by-zero. */
export function fgPercentage(stat: BoxScoreStat): number {
  const attempts = stat.fg_attempted ?? 0;
  if (attempts === 0) return 0;
  return Math.round(((stat.fg_made ?? 0) / attempts) * 1000) / 10;
}

/**
 * Average efficiency across a set of stat entries. Returns 0 for an empty set.
 */
export function averageEfficiency(stats: BoxScoreStat[]): number {
  if (!stats || stats.length === 0) return 0;
  const total = stats.reduce((sum, s) => sum + efficiency(s), 0);
  return Math.round((total / stats.length) * 10) / 10;
}

/**
 * Build a rating-over-time series from evaluations, sorted ascending by date.
 * Shape is chart-ready: [{ date, rating }].
 */
export function ratingTrend(evaluations: RatingPoint[]): { date: string; rating: number }[] {
  return [...evaluations]
    .sort((a, b) => new Date(a.eval_date).getTime() - new Date(b.eval_date).getTime())
    .map((e) => ({ date: e.eval_date, rating: e.rating }));
}
