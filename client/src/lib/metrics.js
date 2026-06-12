// Mirrors server/src/services/metricsService.js ratingTrend — kept here so the
// chart can run without a round-trip when evals are already loaded client-side.
export function ratingTrend(evaluations) {
  return [...evaluations]
    .sort((a, b) => new Date(a.eval_date) - new Date(b.eval_date))
    .map((e) => ({ date: e.eval_date, rating: e.rating }));
}
