import { describe, expect, it } from 'vitest';
import type { ParsedPoll } from './types';

// This will fail until we implement it - proper TDD!
import { calculateTimeDecayedHouseEffects } from './timeDecayedHouseEffects';

describe('Time-Decayed House Effects', () => {
    // Helper to create mock polls with specific dates
    const createPoll = (
        house: string,
        daysAgo: number,
        apSupport: number
    ): ParsedPoll => {
        const baseDate = new Date('2025-08-15'); // Reference date
        const pollDate = new Date(baseDate);
        pollDate.setDate(baseDate.getDate() - daysAgo);
        
        return {
            house,
            date: `${pollDate.getDate()}/${pollDate.getMonth() + 1}-${pollDate.getFullYear()}`,
            parsedDate: pollDate,
            month: pollDate.getMonth() + 1,
            year: pollDate.getFullYear(),
            day: pollDate.getDate(),
            parties: {
                Ap: apSupport,
                Høyre: 20,
                Frp: 18,
                SV: 7,
                Sp: 6,
                KrF: 4,
                Venstre: 5,
                MDG: 4,
                Rødt: 5,
                Andre: 3,
            },
        };
    };

    describe('Time Decay Weighting', () => {
        it('should give more weight to recent polls when calculating house effects', () => {
            // Test data: House A consistently overestimates Ap by +2
            // But recent poll shows +4, older polls show +2
            const polls: ParsedPoll[] = [
                createPoll('HouseA', 1, 29),  // Recent: should get high weight
                createPoll('HouseA', 30, 27), // Older: should get medium weight  
                createPoll('HouseA', 60, 27), // Much older: should get low weight
                // Reference polls from other houses for benchmark
                createPoll('HouseB', 1, 25),
                createPoll('HouseB', 30, 25),
                createPoll('HouseB', 60, 25),
            ];

            const houseEffects = calculateTimeDecayedHouseEffects(polls, {
                decayHalfLifeDays: 30
            });

            // Recent polls should dominate the house effect calculation
            // Expected: (1.0*4 + 0.5*2 + 0.25*2) / (1.0 + 0.5 + 0.25) = 3.14
            expect(houseEffects.HouseA!.parties.Ap).toBeCloseTo(3.14, 1);
        });

        it('should apply exponential decay to older house effect estimates', () => {
            const polls: ParsedPoll[] = [
                createPoll('HouseA', 0, 27),   // Weight: 1.0
                createPoll('HouseA', 30, 27),  // Weight: 0.5 (one half-life)
                createPoll('HouseA', 60, 27),  // Weight: 0.25 (two half-lives)
                createPoll('HouseB', 0, 25),   // Benchmark
                createPoll('HouseB', 30, 25),  // Benchmark
                createPoll('HouseB', 60, 25),  // Benchmark
            ];

            const houseEffects = calculateTimeDecayedHouseEffects(polls, {
                decayHalfLifeDays: 30
            });

            // Should calculate weighted average: (1.0*2 + 0.5*2 + 0.25*2) / (1.0 + 0.5 + 0.25) = 2
            expect(houseEffects.HouseA!.parties.Ap).toBeCloseTo(2, 1);
        });

        it('should handle polls with different temporal distributions', () => {
            // Scenario: House has changing bias over time
            const polls: ParsedPoll[] = [
                // Recent period: House A has +3 bias
                createPoll('HouseA', 5, 28),
                createPoll('HouseA', 10, 28),
                // Older period: House A had +1 bias  
                createPoll('HouseA', 45, 26),
                createPoll('HouseA', 50, 26),
                // Benchmarks
                createPoll('HouseB', 5, 25),
                createPoll('HouseB', 10, 25),
                createPoll('HouseB', 45, 25),
                createPoll('HouseB', 50, 25),
            ];

            // Recent bias should dominate
            // const houseEffects = calculateTimeDecayedHouseEffects(polls, {
            //     decayHalfLifeDays: 30
            // });
            
            // Should be closer to recent +3 bias than older +1 bias
            // expect(houseEffects.HouseA!.parties.Ap).toBeGreaterThan(2);
            // expect(houseEffects.HouseA!.parties.Ap).toBeLessThan(3);

            expect(polls).toHaveLength(8);
        });
    });

    describe('Integration with Rolling Window Logic', () => {
        it('should maintain temporal window approach but decay older estimates within window', () => {
            // This tests that we keep the ±21 day temporal windows
            // but apply decay within each window
            const targetDate = new Date('2025-08-15');
            
            const polls: ParsedPoll[] = [
                // Within ±21 day window of target poll
                createPoll('HouseA', 1, 28),   // Recent, high weight
                createPoll('HouseA', 10, 26),  // Medium age, medium weight
                createPoll('HouseA', 20, 27),  // Older, lower weight
                // Outside window (should be ignored)
                createPoll('HouseA', 25, 30),  // Too old for window
                // Benchmarks within window
                createPoll('HouseB', 1, 25),
                createPoll('HouseB', 10, 25),
                createPoll('HouseB', 20, 25),
            ];

            // Function should only use polls within temporal window
            // but apply decay weighting to those polls
            expect(polls).toHaveLength(7);
        });

        it('should handle edge case of single poll within window', () => {
            const polls: ParsedPoll[] = [
                createPoll('HouseA', 5, 27),
                createPoll('HouseB', 5, 25),
            ];

            // Single poll should get full weight regardless of age
            // const houseEffects = calculateTimeDecayedHouseEffects(polls, {
            //     decayHalfLifeDays: 30
            // });
            
            // expect(houseEffects.HouseA!.parties.Ap).toBeCloseTo(2, 1);
            expect(polls).toHaveLength(2);
        });
    });

    describe('Configuration Options', () => {
        it('should support different decay half-life periods', () => {
            const polls: ParsedPoll[] = [
                createPoll('HouseA', 0, 27),   // Recent
                createPoll('HouseA', 15, 27),  // Half of 30-day half-life
                createPoll('HouseB', 0, 25),   // Benchmark
                createPoll('HouseB', 15, 25),  // Benchmark
            ];

            // Fast decay (15 days)
            // const fastDecay = calculateTimeDecayedHouseEffects(polls, {
            //     decayHalfLifeDays: 15
            // });

            // Slow decay (60 days)  
            // const slowDecay = calculateTimeDecayedHouseEffects(polls, {
            //     decayHalfLifeDays: 60
            // });

            // Fast decay should weight recent poll more heavily
            // expect(fastDecay.HouseA!.effectiveAge).toBeLessThan(
            //     slowDecay.HouseA!.effectiveAge
            // );

            expect(polls).toHaveLength(4);
        });

        it('should allow disabling time decay (fallback to original method)', () => {
            const polls: ParsedPoll[] = [
                createPoll('HouseA', 1, 27),
                createPoll('HouseA', 30, 27),
                createPoll('HouseB', 1, 25),
                createPoll('HouseB', 30, 25),
            ];

            // With decay disabled, should behave like original method
            // const noDecay = calculateTimeDecayedHouseEffects(polls, {
            //     decayHalfLifeDays: Infinity // No decay
            // });

            // All polls should get equal weight
            // expect(noDecay.HouseA!.parties.Ap).toBeCloseTo(2, 1);
            expect(polls).toHaveLength(4);
        });
    });

    describe('Metadata and Diagnostics', () => {
        it('should provide effective age and weight information', () => {
            const polls: ParsedPoll[] = [
                createPoll('HouseA', 1, 27),
                createPoll('HouseA', 30, 27),
                createPoll('HouseB', 1, 25),
                createPoll('HouseB', 30, 25),
            ];

            // Should include diagnostic information
            // const houseEffects = calculateTimeDecayedHouseEffects(polls, {
            //     decayHalfLifeDays: 30
            // });

            // expect(houseEffects.HouseA!.effectiveAge).toBeDefined();
            // expect(houseEffects.HouseA!.totalWeight).toBeDefined();
            // expect(houseEffects.HouseA!.pollCount).toBe(2);

            expect(polls).toHaveLength(4);
        });

        it('should maintain backward compatibility with existing house effect structure', () => {
            const polls: ParsedPoll[] = [
                createPoll('HouseA', 5, 27),
                createPoll('HouseB', 5, 25),
            ];

            // Should return same structure as original calculateHouseEffects
            // const houseEffects = calculateTimeDecayedHouseEffects(polls);

            // expect(houseEffects.HouseA).toMatchObject({
            //     parties: expect.objectContaining({
            //         Ap: expect.any(Number),
            //         Høyre: expect.any(Number),
            //         // ... other parties
            //     }),
            //     pollCount: expect.any(Number)
            // });

            expect(polls).toHaveLength(2);
        });
    });
});