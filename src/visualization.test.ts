import { describe, expect, it } from 'vitest';
import type { AdjustedPoll } from './types';
import {
    generateStandingsBarChart,
    generateStandingsSummary,
    getAdjustmentComparison,
    getCurrentStandings,
} from './visualization';

describe('Visualization', () => {
    const createAdjustedPoll = (house: string, date: string, apValue: number): AdjustedPoll => ({
        house,
        date,
        parsedDate: new Date(date),
        month: 8,
        year: 2025,
        day: 1,
        parties: {
            Ap: apValue,
            Høyre: 15,
            Frp: 20,
            SV: 6,
            Sp: 7,
            KrF: 5,
            Venstre: 4,
            MDG: 4,
            Rødt: 6,
            Andre: 8,
        },
        originalParties: {
            Ap: apValue + 1,
            Høyre: 15,
            Frp: 20,
            SV: 6,
            Sp: 7,
            KrF: 5,
            Venstre: 4,
            MDG: 4,
            Rødt: 6,
            Andre: 8,
        },
        adjustments: { Ap: -1 },
    });

    describe('getCurrentStandings', () => {
        it('should calculate current standings from adjusted polls', () => {
            const adjustedPolls: AdjustedPoll[] = [
                createAdjustedPoll('House1', '2025-08-01', 25),
                createAdjustedPoll('House2', '2025-08-02', 27),
                createAdjustedPoll('House3', '2025-08-03', 23),
            ];

            const standings = getCurrentStandings(adjustedPolls, 14);

            expect(standings).toBeDefined();
            expect(standings!.lookbackDays).toBe(14);
            expect(standings!.pollCount).toBe(3);
            expect(standings!.standings[0]!.party).toBe('Ap'); // Should be highest
            expect(standings!.standings[0]!.percentage).toBe(25); // (25+27+23)/3
        });

        it('should return null for empty polls', () => {
            const standings = getCurrentStandings([], 14);
            expect(standings).toBeNull();
        });

        it('should sort parties by percentage descending', () => {
            const adjustedPolls: AdjustedPoll[] = [createAdjustedPoll('House1', '2025-08-01', 10)];

            const standings = getCurrentStandings(adjustedPolls, 14);

            expect(standings).toBeDefined();
            expect(standings!.standings[0]!.party).toBe('Frp'); // 20% should be highest
            expect(standings!.standings[1]!.party).toBe('Høyre'); // 15% should be second
            expect(standings!.standings[2]!.party).toBe('Ap'); // 10% should be third
        });
    });

    describe('generateStandingsBarChart', () => {
        it('should generate ASCII bar chart', () => {
            const standings = {
                date: '22/8-2025',
                lookbackDays: 14,
                pollCount: 3,
                houses: ['House1', 'House2', 'House3'],
                standings: [
                    { party: 'Ap', percentage: 25.5, displayName: 'Ap' },
                    { party: 'Frp', percentage: 20.1, displayName: 'Frp' },
                    { party: 'Høyre', percentage: 15.3, displayName: 'Høyre' },
                ],
            };

            const chart = generateStandingsBarChart(standings);

            expect(chart).toContain('Norske Meningsmålinger');
            expect(chart).toContain('22/8-2025');
            expect(chart).toContain('14 dagers tilbakeblikk');
            expect(chart).toContain('3 målinger');
            expect(chart).toContain('Ap      25.5%');
            expect(chart).toContain('Frp     20.1%');
            expect(chart).toContain('█'); // Should contain bar characters
        });

        it('should handle empty standings', () => {
            const standings = {
                date: '22/8-2025',
                lookbackDays: 14,
                pollCount: 0,
                houses: [],
                standings: [],
            };

            const chart = generateStandingsBarChart(standings);
            expect(chart).toBe('No data available');
        });
    });

    describe('generateStandingsSummary', () => {
        it('should generate compact summary', () => {
            const standings = {
                date: '22/8-2025',
                lookbackDays: 14,
                pollCount: 3,
                houses: ['House1', 'House2'],
                standings: [
                    { party: 'Ap', percentage: 25.5, displayName: 'Ap' },
                    { party: 'Frp', percentage: 20.1, displayName: 'Frp' },
                    { party: 'Høyre', percentage: 15.3, displayName: 'Høyre' },
                ],
            };

            const summary = generateStandingsSummary(standings);

            expect(summary).toContain('Nåværende (14d, 3 målinger)');
            expect(summary).toContain('Ap 25.5%');
            expect(summary).toContain('Frp 20.1%');
            expect(summary).toContain('Høyre 15.3%');
        });
    });

    describe('getAdjustmentComparison', () => {
        it('should compare raw vs adjusted standings', () => {
            const rawPolls = [
                {
                    house: 'House1',
                    date: '1/8-2025',
                    parsedDate: new Date('2025-08-01'),
                    month: 8,
                    year: 2025,
                    day: 1,
                    parties: {
                        Ap: 26,
                        Høyre: 15,
                        Frp: 20,
                        SV: 6,
                        Sp: 7,
                        KrF: 5,
                        Venstre: 4,
                        MDG: 4,
                        Rødt: 6,
                        Andre: 8,
                    },
                },
            ];

            const adjustedPolls: AdjustedPoll[] = [
                createAdjustedPoll('House1', '2025-08-01', 25), // 1pt adjustment
            ];

            const comparison = getAdjustmentComparison(rawPolls, adjustedPolls, 14);

            expect(comparison.raw).toBeDefined();
            expect(comparison.adjusted).toBeDefined();
            expect(comparison.differences).toHaveLength(10); // All parties

            const apDiff = comparison.differences.find((d) => d.party === 'Ap');
            expect(apDiff).toBeDefined();
            expect(apDiff!.rawPct).toBe(26);
            expect(apDiff!.adjustedPct).toBe(25);
            expect(apDiff!.difference).toBe(-1);
        });
    });
});
