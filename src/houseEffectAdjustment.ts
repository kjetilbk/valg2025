import type { AdjustedPoll, HouseEffects, ParsedPoll } from './types';
import { PARTY_NAMES } from './types';

/**
 * Apply house effects to polls to generate adjusted results
 */
export function applyHouseEffects(polls: ParsedPoll[], houseEffects: HouseEffects): AdjustedPoll[] {
    return polls.map((poll) => {
        const houseEffect = houseEffects[poll.house];
        const adjustments: Partial<Record<string, number>> = {};
        const adjustedParties: Record<string, number> = { ...poll.parties };

        if (houseEffect) {
            for (const party of PARTY_NAMES) {
                const effect = houseEffect[party];
                if (effect !== undefined && poll.parties[party] !== undefined) {
                    // Subtract house effect to correct the bias
                    adjustments[party] = -effect;
                    adjustedParties[party] = poll.parties[party]! - effect;
                }
            }
        }

        return {
            ...poll,
            parties: adjustedParties,
            originalParties: { ...poll.parties },
            adjustments,
        };
    });
}

/**
 * Get adjustment summary for a specific poll
 */
export function getPollAdjustmentSummary(adjustedPoll: AdjustedPoll): {
    house: string;
    date: string;
    hasAdjustments: boolean;
    adjustmentCount: number;
    largestAdjustment: { party: string; adjustment: number } | null;
} {
    const adjustmentEntries = Object.entries(adjustedPoll.adjustments).filter(
        ([, adj]) => adj !== undefined
    );

    let largestAdjustment: { party: string; adjustment: number } | null = null;
    if (adjustmentEntries.length > 0) {
        const [party, adjustment] = adjustmentEntries.reduce((max, [p, adj]) =>
            Math.abs(adj!) > Math.abs(max[1]!) ? [p, adj!] : max
        );
        largestAdjustment = { party, adjustment: adjustment! };
    }

    return {
        house: adjustedPoll.house,
        date: adjustedPoll.date,
        hasAdjustments: adjustmentEntries.length > 0,
        adjustmentCount: adjustmentEntries.length,
        largestAdjustment,
    };
}
