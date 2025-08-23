import { parseNorwegianPolls } from './dataParser';
import { applyHouseEffects } from './houseEffectAdjustment';
import { calculateHouseEffects } from './houseEffects';
import { calculateCurrentAverage, calculatePollingAverages } from './pollingAverages';
import type { AnalysisResult } from './types';

export function analyzeNorwegianPolls(
    csvContent: string,
    options: {
        includeAdjustments?: boolean;
        includeAverages?: boolean;
        averageTimeSpan?: number;
        averageStepDays?: number;
    } = {}
): AnalysisResult {
    const {
        includeAdjustments = false,
        includeAverages = false,
        averageTimeSpan = 14,
        averageStepDays = 7,
    } = options;

    const polls = parseNorwegianPolls(csvContent);
    const houseEffects = calculateHouseEffects(polls);

    let adjustedPolls;
    let averages;

    if (includeAdjustments || includeAverages) {
        adjustedPolls = applyHouseEffects(polls, houseEffects);

        if (includeAverages) {
            averages = calculatePollingAverages(adjustedPolls, {
                timeSpanDays: averageTimeSpan,
                stepDays: averageStepDays,
            });
        }
    }

    return {
        polls,
        monthlyBenchmarks: {}, // Legacy field, now empty since we use rolling windows
        houseEffects,
        adjustedPolls,
        averages,
        summary: {
            totalPolls: polls.length,
            dateRange: {
                earliest: polls[0]!.date,
                latest: polls[polls.length - 1]!.date,
            },
            pollsters: Array.from(new Set(polls.map((p) => p.house))).sort(),
            months: Array.from(new Set(polls.map((p) => p.month))).sort(),
        },
    };
}
