import type { ParsedPoll, PartyName, HouseEffects, HouseEffect } from './types';
import { PARTY_NAMES } from './types';

export interface TimeDecayOptions {
    decayHalfLifeDays?: number;
    windowDays?: number;
}

export interface EnhancedHouseEffect extends HouseEffect {
    parties: Record<PartyName, number>;
    effectiveAge?: number;
    totalWeight?: number;
    pollCount: number;
}

export interface EnhancedHouseEffects {
    [house: string]: EnhancedHouseEffect;
}

/**
 * Calculate house effects with time-decay weighting
 * Recent house effect estimates get more weight than older ones
 */
export function calculateTimeDecayedHouseEffects(
    polls: ParsedPoll[],
    options: TimeDecayOptions = {}
): EnhancedHouseEffects {
    const {
        decayHalfLifeDays = 30,
        windowDays = 21
    } = options;

    const result: EnhancedHouseEffects = {};

    // Get all unique houses
    const houses = Array.from(new Set(polls.map(p => p.house)));
    const mostRecentDate = Math.max(...polls.map(p => p.parsedDate.getTime()));

    // For each house, collect all its house effect estimates with decay weights
    for (const house of houses) {
        const housePolls = polls.filter(p => p.house === house);
        const estimates: Array<{
            estimate: Record<PartyName, number>;
            weight: number;
            age: number;
        }> = [];

        // Calculate house effect for each poll of this house
        for (const poll of housePolls) {
            const estimate = calculatePollHouseEffect(poll, polls, windowDays);
            const ageDays = (mostRecentDate - poll.parsedDate.getTime()) / (24 * 60 * 60 * 1000);
            const weight = Math.pow(0.5, ageDays / decayHalfLifeDays);
            
            estimates.push({
                estimate,
                weight,
                age: ageDays
            });
        }

        // Aggregate with decay weighting
        const aggregated = aggregateWithDecay(estimates);
        result[house] = {
            parties: aggregated.parties,
            pollCount: estimates.length,
            effectiveAge: aggregated.effectiveAge,
            totalWeight: aggregated.totalWeight,
            ...aggregated.parties
        };
    }

    return result;
}

/**
 * Calculate house effect for a single poll using temporal window
 */
function calculatePollHouseEffect(
    targetPoll: ParsedPoll,
    allPolls: ParsedPoll[],
    windowDays: number
): Record<PartyName, number> {
    const targetTime = targetPoll.parsedDate.getTime();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    
    // Find polls within temporal window (excluding the target poll itself)
    const windowPolls = allPolls.filter(poll => {
        const pollTime = poll.parsedDate.getTime();
        const timeDiff = Math.abs(pollTime - targetTime);
        return timeDiff <= windowMs && poll !== targetPoll;
    });

    // If no other polls in window, include the target poll for benchmark
    if (windowPolls.length === 0) {
        windowPolls.push(targetPoll);
    }

    // Calculate benchmark (simple average of all polls in window)
    const benchmark: Record<PartyName, number> = {} as Record<PartyName, number>;

    for (const party of PARTY_NAMES) {
        let sum = 0;
        for (const poll of windowPolls) {
            sum += poll.parties[party];
        }
        benchmark[party] = sum / windowPolls.length;
    }

    // Calculate house effect as difference from benchmark
    const estimate: Record<PartyName, number> = {} as Record<PartyName, number>;
    for (const party of PARTY_NAMES) {
        estimate[party] = targetPoll.parties[party] - benchmark[party];
    }

    return estimate;
}

/**
 * Aggregate house effect estimates using decay weighting
 */
function aggregateWithDecay(estimates: Array<{
    estimate: Record<PartyName, number>;
    weight: number;
    age: number;
}>): {
    parties: Record<PartyName, number>;
    effectiveAge: number;
    totalWeight: number;
} {
    const parties: Record<PartyName, number> = {} as Record<PartyName, number>;
    let totalWeight = 0;
    let weightedAgeSum = 0;

    // Initialize parties
    for (const party of PARTY_NAMES) {
        parties[party] = 0;
    }

    // Aggregate with weights
    for (const est of estimates) {
        totalWeight += est.weight;
        weightedAgeSum += est.age * est.weight;

        for (const party of PARTY_NAMES) {
            parties[party] += est.estimate[party] * est.weight;
        }
    }

    // Calculate weighted averages
    if (totalWeight > 0) {
        for (const party of PARTY_NAMES) {
            parties[party] /= totalWeight;
        }
    }

    const effectiveAge = totalWeight > 0 ? weightedAgeSum / totalWeight : 0;

    return {
        parties,
        effectiveAge,
        totalWeight
    };
}