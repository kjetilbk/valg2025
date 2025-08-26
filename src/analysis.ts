import { loadAllPolls } from './dataParser';
import { applyHouseEffects } from './houseEffectAdjustment';
import { calculateHouseEffects } from './houseEffects';
import { calculatePollingAverages } from './pollingAverages';
import type { AdjustedPoll, AnalysisResult, PollingAverage } from './types';

export function analyzeNorwegianPolls(
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

    const polls = loadAllPolls();
    const houseEffects = calculateHouseEffects(polls);

    let adjustedPolls: AdjustedPoll[] | undefined;
    let averages: PollingAverage[] | undefined;

    if (includeAdjustments || includeAverages) {
        adjustedPolls = applyHouseEffects(polls, houseEffects);

        if (includeAverages) {
            averages = calculatePollingAverages(adjustedPolls, {
                timeSpanDays: averageTimeSpan,
                stepDays: averageStepDays,
            });
        }
    }

    const result: AnalysisResult = {
        polls,
        monthlyBenchmarks: {}, // Legacy field, now empty since we use rolling windows
        houseEffects,
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

    if (adjustedPolls) {
        result.adjustedPolls = adjustedPolls;
    }
    if (averages) {
        result.averages = averages;
    }

    return result;
}
