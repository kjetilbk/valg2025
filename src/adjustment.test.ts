import { describe, expect, it } from 'vitest';
import { applyHouseEffects, getPollAdjustmentSummary } from './houseEffectAdjustment';
import { calculateCurrentAverage, calculatePollingAverages } from './pollingAverages';
import type { AdjustedPoll, HouseEffects, ParsedPoll } from './types';

describe('House Effect Adjustment', () => {
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
            date: '2/8-2025',
            parsedDate: new Date(2025, 7, 2),
            month: 8,
            year: 2025,
            day: 2,
            parties: {
                Ap: 23,
                Høyre: 17,
                Frp: 18,
                SV: 8,
                Sp: 5,
                KrF: 3,
                Venstre: 6,
                MDG: 6,
                Rødt: 4,
                Andre: 10,
            },
        },
    ];

    const mockHouseEffects: HouseEffects = {
        House1: {
            pollCount: 1,
            Ap: 2, // House1 overestimates Ap by 2 points
            Høyre: -1, // House1 underestimates Høyre by 1 point
            Frp: 0.5,
        },
        House2: {
            pollCount: 1,
            Ap: -1, // House2 underestimates Ap by 1 point
            Frp: -2,
        },
    };

    describe('applyHouseEffects', () => {
        it('should apply house effect corrections to polls', () => {
            const adjustedPolls = applyHouseEffects(mockPolls, mockHouseEffects);

            expect(adjustedPolls).toHaveLength(2);

            // Check first poll (House1)
            const house1Poll = adjustedPolls[0]!;
            expect(house1Poll.house).toBe('House1');
            expect(house1Poll.originalParties.Ap).toBe(25);
            expect(house1Poll.parties.Ap).toBe(23); // 25 - 2 (correction)
            expect(house1Poll.adjustments.Ap).toBe(-2);

            expect(house1Poll.originalParties.Høyre).toBe(15);
            expect(house1Poll.parties.Høyre).toBe(16); // 15 - (-1) = 16 (correction)
            expect(house1Poll.adjustments.Høyre).toBe(1);

            // Check second poll (House2)
            const house2Poll = adjustedPolls[1]!;
            expect(house2Poll.house).toBe('House2');
            expect(house2Poll.originalParties.Ap).toBe(23);
            expect(house2Poll.parties.Ap).toBe(24); // 23 - (-1) = 24 (correction)
            expect(house2Poll.adjustments.Ap).toBe(1);
        });

        it('should handle polls from houses without effects', () => {
            const pollsWithUnknownHouse: ParsedPoll[] = [
                {
                    ...mockPolls[0]!,
                    house: 'UnknownHouse',
                },
            ];

            const adjustedPolls = applyHouseEffects(pollsWithUnknownHouse, mockHouseEffects);

            expect(adjustedPolls).toHaveLength(1);
            expect(adjustedPolls[0]!.parties.Ap).toBe(25); // No adjustment
            expect(adjustedPolls[0]!.adjustments).toEqual({});
        });
    });

    describe('getPollAdjustmentSummary', () => {
        it('should provide adjustment summary', () => {
            const adjustedPolls = applyHouseEffects(mockPolls, mockHouseEffects);
            const summary = getPollAdjustmentSummary(adjustedPolls[0]!);

            expect(summary.house).toBe('House1');
            expect(summary.hasAdjustments).toBe(true);
            expect(summary.adjustmentCount).toBe(3); // Ap, Høyre, Frp
            expect(summary.largestAdjustment).toEqual({
                party: 'Ap',
                adjustment: -2,
            });
        });
    });
});

describe('Polling Averages', () => {
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

    describe('calculateCurrentAverage', () => {
        it('should calculate average from recent polls', () => {
            const adjustedPolls: AdjustedPoll[] = [
                createAdjustedPoll('House1', '2025-08-01', 25),
                createAdjustedPoll('House2', '2025-08-02', 27),
                createAdjustedPoll('House3', '2025-08-03', 23),
            ];

            const average = calculateCurrentAverage(adjustedPolls, 14);

            expect(average).toBeDefined();
            expect(average!.pollCount).toBe(3);
            expect(average!.parties.Ap).toBe(25); // (25+27+23)/3
            expect(average!.houses.sort()).toEqual(['House1', 'House2', 'House3']);
            expect(average!.timeSpan).toBe('Current (14 days)');
        });

        it('should return null for empty polls', () => {
            const average = calculateCurrentAverage([], 14);
            expect(average).toBeNull();
        });
    });

    describe('calculatePollingAverages', () => {
        it('should calculate time series averages', () => {
            const adjustedPolls: AdjustedPoll[] = [
                createAdjustedPoll('House1', '2025-08-01', 25),
                createAdjustedPoll('House2', '2025-08-08', 27),
                createAdjustedPoll('House3', '2025-08-15', 23),
            ];

            const averages = calculatePollingAverages(adjustedPolls, {
                timeSpanDays: 14,
                stepDays: 7,
            });

            expect(averages.length).toBeGreaterThan(0);
            expect(averages[0]!.pollCount).toBeGreaterThan(0);
            expect(averages[0]!.parties.Ap).toBeDefined();
        });

        it('should handle empty polls gracefully', () => {
            const averages = calculatePollingAverages([], { timeSpanDays: 14 });
            expect(averages).toEqual([]);
        });
    });
});
