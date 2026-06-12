import {
  efficiency,
  fgPercentage,
  averageEfficiency,
  ratingTrend,
} from '../src/services/metricsService.js';

describe('efficiency', () => {
  test('adds positive box-score contributions and subtracts missed FGs', () => {
    // 20 pts + 5 reb + 4 ast - (12 - 8 missed) = 25
    const stat = { points: 20, rebounds: 5, assists: 4, fg_made: 8, fg_attempted: 12 };
    expect(efficiency(stat)).toBe(25);
  });

  test('treats missing fields as zero', () => {
    expect(efficiency({ points: 10 })).toBe(10);
  });
});

describe('fgPercentage', () => {
  test('computes a one-decimal percentage', () => {
    expect(fgPercentage({ fg_made: 5, fg_attempted: 10 })).toBe(50);
  });

  test('returns 0 when there are no attempts (no divide-by-zero)', () => {
    expect(fgPercentage({ fg_made: 0, fg_attempted: 0 })).toBe(0);
  });
});

describe('averageEfficiency', () => {
  test('returns 0 for an empty set', () => {
    expect(averageEfficiency([])).toBe(0);
  });

  test('averages across entries', () => {
    const stats = [
      { points: 10 }, // eff 10
      { points: 20 }, // eff 20
    ];
    expect(averageEfficiency(stats)).toBe(15);
  });
});

describe('ratingTrend', () => {
  test('sorts evaluations ascending by date and shapes for charting', () => {
    const evals = [
      { eval_date: '2025-02-01', rating: 7 },
      { eval_date: '2025-01-01', rating: 5 },
    ];
    expect(ratingTrend(evals)).toEqual([
      { date: '2025-01-01', rating: 5 },
      { date: '2025-02-01', rating: 7 },
    ]);
  });
});
