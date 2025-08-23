import type { HouseEffect, HouseEffects, ParsedPoll, PollWithDeviations } from './types';
import { PARTY_NAMES } from './types';

/**
 * Calculate rolling window benchmark for a specific poll
 */
function calculateBenchmarkForPoll(
    targetPoll: ParsedPoll,
    allPolls: ParsedPoll[],
    windowDays: number = 14,
    minPolls: number = 5
): Record<string, number> | null {
    const targetTime = targetPoll.parsedDate.getTime();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;

    // Get polls within window
    let windowPolls = allPolls.filter((poll) => {
        const pollTime = poll.parsedDate.getTime();
        return Math.abs(pollTime - targetTime) <= windowMs;
    });

    // Expand window if insufficient polls
    if (windowPolls.length < minPolls) {
        const expandedWindowMs = 28 * 24 * 60 * 60 * 1000; // 4 weeks
        windowPolls = allPolls.filter((poll) => {
            const pollTime = poll.parsedDate.getTime();
            return Math.abs(pollTime - targetTime) <= expandedWindowMs;
        });

        // If still insufficient, expand to 6 weeks max
        if (windowPolls.length < minPolls) {
            const maxWindowMs = 42 * 24 * 60 * 60 * 1000; // 6 weeks
            windowPolls = allPolls.filter((poll) => {
                const pollTime = poll.parsedDate.getTime();
                return Math.abs(pollTime - targetTime) <= maxWindowMs;
            });
        }
    }

    if (windowPolls.length === 0) return null;

    const benchmark: Record<string, number> = {};

    for (const party of PARTY_NAMES) {
        const values = windowPolls
            .map((poll) => poll.parties[party])
            .filter((val): val is number => val !== undefined && !isNaN(val));

        if (values.length > 0) {
            benchmark[party] = values.reduce((sum, val) => sum + val, 0) / values.length;
        }
    }

    return benchmark;
}

/**
 * Calculate house effects using rolling time window benchmarks
 */
export function calculateHouseEffects(polls: ParsedPoll[]): HouseEffects {
    // Calculate deviations for each poll against its rolling window benchmark
    const pollsWithDeviations: PollWithDeviations[] = polls.map((poll) => {
        const benchmark = calculateBenchmarkForPoll(poll, polls);
        const deviations: Record<string, number> = {};

        if (benchmark) {
            for (const party of PARTY_NAMES) {
                const pollValue = poll.parties[party];
                const benchmarkValue = benchmark[party];

                if (pollValue !== undefined && benchmarkValue !== undefined) {
                    deviations[party] = pollValue - benchmarkValue;
                }
            }
        }

        return { ...poll, monthlyDeviations: deviations };
    });

    // Group by house and calculate average deviations
    const pollsByHouse: Record<string, PollWithDeviations[]> = {};
    pollsWithDeviations.forEach((poll) => {
        if (!pollsByHouse[poll.house]) {
            pollsByHouse[poll.house] = [];
        }
        pollsByHouse[poll.house]!.push(poll);
    });

    const houseEffects: HouseEffects = {};

    Object.entries(pollsByHouse).forEach(([house, housePolls]) => {
        const effects: HouseEffect = { pollCount: housePolls.length };

        for (const party of PARTY_NAMES) {
            const deviations = housePolls
                .map((poll) => poll.monthlyDeviations?.[party])
                .filter((dev): dev is number => dev !== undefined);

            if (deviations.length > 0) {
                effects[party] = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
            }
        }

        houseEffects[house] = effects;
    });

    return houseEffects;
}
