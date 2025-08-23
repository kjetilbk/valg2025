import { parseNorwegianPolls } from './dataParser';
import { calculateHouseEffects } from './houseEffects';
import type { AnalysisResult } from '../types';

export function analyzeNorwegianPolls(csvContent: string): AnalysisResult {
    const polls = parseNorwegianPolls(csvContent);
    const houseEffects = calculateHouseEffects(polls);

    return {
        polls,
        monthlyBenchmarks: {}, // Legacy field, now empty since we use rolling windows
        houseEffects,
        summary: {
            totalPolls: polls.length,
            dateRange: {
                earliest: polls[0]!.date,
                latest: polls[polls.length - 1]!.date
            },
            pollsters: Array.from(new Set(polls.map(p => p.house))).sort(),
            months: Array.from(new Set(polls.map(p => p.month))).sort()
        }
    };
}