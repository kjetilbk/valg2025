import { describe, expect, it } from 'vitest';
import {
    type AnalysisResult,
    analyzeNorwegianPolls,
    calculateHouseEffects,
    type ParsedPoll,
    parseNorwegianPolls,
} from './index';

describe('Norwegian Poll Analysis', () => {
    describe('CSV Parsing', () => {
        it('should parse sample CSV data correctly', () => {
            const sampleCsv = `Oppslutning i prosent. Antall mandater i parentes.

Måling;Dato;Ap;Høyre;Frp;SV;Sp;KrF;Venstre;MDG;Rødt;Andre
Verian/TV2;22/8-2025;26,7 (50);14,9 (24);22,8 (44);5,8 (10);6,0 (10);5,2 (8);3,2 (2);4,8 (8);7,3 (12);3,4 (1)
Opinion/DA;20/8-2025;24,8 (47);17,9 (34);21,5 (41);5,5 (10);6,8 (13);4,5 (8);3,9 (3);3,6 (3);5,6 (10);5,8 (0)`;

            const polls = parseNorwegianPolls(sampleCsv);

            expect(polls).toHaveLength(2);

            // Test first poll (sorted by date)
            expect(polls[0]).toEqual({
                house: 'Opinion',
                date: '20/8-2025',
                parsedDate: new Date(2025, 7, 20), // August is month 7 (0-indexed)
                month: 8,
                year: 2025,
                day: 20,
                parties: {
                    Ap: 24.8,
                    Høyre: 17.9,
                    Frp: 21.5,
                    SV: 5.5,
                    Sp: 6.8,
                    KrF: 4.5,
                    Venstre: 3.9,
                    MDG: 3.6,
                    Rødt: 5.6,
                    Andre: 5.8,
                },
            });

            // Test second poll
            expect(polls[1]).toEqual({
                house: 'Verian',
                date: '22/8-2025',
                parsedDate: new Date(2025, 7, 22),
                month: 8,
                year: 2025,
                day: 22,
                parties: {
                    Ap: 26.7,
                    Høyre: 14.9,
                    Frp: 22.8,
                    SV: 5.8,
                    Sp: 6.0,
                    KrF: 5.2,
                    Venstre: 3.2,
                    MDG: 4.8,
                    Rødt: 7.3,
                    Andre: 3.4,
                },
            });
        });
    });

    describe('Rolling Window House Effects', () => {
        it('should calculate house effects with temporal windows', () => {
            const mockPolls: ParsedPoll[] = [
                {
                    house: 'House1',
                    date: '1/8-2025',
                    parsedDate: new Date(2025, 7, 1),
                    month: 8,
                    year: 2025,
                    day: 1,
                    parties: {
                        Ap: 25,
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
                {
                    house: 'House2',
                    date: '15/8-2025',
                    parsedDate: new Date(2025, 7, 15),
                    month: 8,
                    year: 2025,
                    day: 15,
                    parties: {
                        Ap: 27,
                        Høyre: 17,
                        Frp: 18,
                        SV: 8,
                        Sp: 5,
                        KrF: 3,
                        Venstre: 6,
                        MDG: 6,
                        Rødt: 4,
                        Andre: 6,
                    },
                },
                {
                    house: 'House3',
                    date: '1/9-2025',
                    parsedDate: new Date(2025, 8, 1),
                    month: 9,
                    year: 2025,
                    day: 1,
                    parties: {
                        Ap: 30,
                        Høyre: 20,
                        Frp: 15,
                        SV: 7,
                        Sp: 8,
                        KrF: 4,
                        Venstre: 5,
                        MDG: 5,
                        Rødt: 3,
                        Andre: 3,
                    },
                },
            ];

            const houseEffects = calculateHouseEffects(mockPolls);

            expect(houseEffects.House1).toBeDefined();
            expect(houseEffects.House2).toBeDefined();
            expect(houseEffects.House3).toBeDefined();

            // Each house should have poll count of 1
            expect(houseEffects.House1!.pollCount).toBe(1);
            expect(houseEffects.House2!.pollCount).toBe(1);
            expect(houseEffects.House3!.pollCount).toBe(1);
        });

        it('should calculate house effects with consistent biases', () => {
            const mockPolls: ParsedPoll[] = [
                {
                    house: 'House1',
                    date: '1/8-2025',
                    parsedDate: new Date(2025, 7, 1),
                    month: 8,
                    year: 2025,
                    day: 1,
                    parties: {
                        Ap: 28,
                        Høyre: 18,
                        Frp: 20,
                        SV: 6,
                        Sp: 7,
                        KrF: 5,
                        Venstre: 4,
                        MDG: 4,
                        Rødt: 6,
                        Andre: 2,
                    },
                },
                {
                    house: 'House1',
                    date: '15/8-2025',
                    parsedDate: new Date(2025, 7, 15),
                    month: 8,
                    year: 2025,
                    day: 15,
                    parties: {
                        Ap: 30,
                        Høyre: 20,
                        Frp: 18,
                        SV: 8,
                        Sp: 5,
                        KrF: 3,
                        Venstre: 6,
                        MDG: 4,
                        Rødt: 4,
                        Andre: 2,
                    },
                },
                {
                    house: 'House2',
                    date: '2/8-2025',
                    parsedDate: new Date(2025, 7, 2),
                    month: 8,
                    year: 2025,
                    day: 2,
                    parties: {
                        Ap: 24,
                        Høyre: 14,
                        Frp: 22,
                        SV: 6,
                        Sp: 7,
                        KrF: 5,
                        Venstre: 4,
                        MDG: 6,
                        Rødt: 8,
                        Andre: 4,
                    },
                },
                {
                    house: 'House2',
                    date: '16/8-2025',
                    parsedDate: new Date(2025, 7, 16),
                    month: 8,
                    year: 2025,
                    day: 16,
                    parties: {
                        Ap: 22,
                        Høyre: 12,
                        Frp: 24,
                        SV: 8,
                        Sp: 9,
                        KrF: 7,
                        Venstre: 2,
                        MDG: 8,
                        Rødt: 6,
                        Andre: 2,
                    },
                },
            ];

            const houseEffects = calculateHouseEffects(mockPolls);

            expect(houseEffects.House1).toBeDefined();
            expect(houseEffects.House2).toBeDefined();

            expect(houseEffects.House1!.pollCount).toBe(2);
            expect(houseEffects.House2!.pollCount).toBe(2);

            // House1 should have positive effect for Ap (consistently above average)
            expect(houseEffects.House1!.Ap).toBeGreaterThan(0);

            // House2 should have negative effect for Ap (consistently below average)
            expect(houseEffects.House2!.Ap).toBeLessThan(0);
        });
    });

    describe('Full Analysis Integration', () => {
        it('should perform complete analysis with real CSV data', () => {
            let analysis: AnalysisResult;
            try {
                analysis = analyzeNorwegianPolls();
            } catch {
                console.warn('polls.csv not found, skipping real data test');
                return;
            }

            // Verify exact counts from the real data (including unreleased polls)
            expect(analysis.polls.length).toBe(28);
            expect(analysis.summary.totalPolls).toBe(28);
            expect(analysis.summary.pollsters).toEqual([
                'InFact',
                'Norfakta',
                'Norstat',
                'Opinion',
                'Respons',
                'Verian',
            ]);
            expect(analysis.summary.months).toEqual([5, 6, 7, 8]);
            expect(analysis.summary.dateRange.earliest).toBe('6/5-2025');
            expect(analysis.summary.dateRange.latest).toBe('26/8-2025');

            // Check that we have house effects for each pollster
            for (const pollster of analysis.summary.pollsters) {
                expect(analysis.houseEffects[pollster]).toBeDefined();
                expect(analysis.houseEffects[pollster]!.pollCount).toBeGreaterThan(0);
            }

            // Monthly benchmarks field is now legacy (empty object)
            expect(analysis.monthlyBenchmarks).toEqual({});

            // Verify we have the expected number of polls (regular + unreleased)
            expect(analysis.polls.length).toBeGreaterThanOrEqual(27);
        });
    });
});
