// Main exports
export { analyzeNorwegianPolls } from './analysis';
export { parseNorwegianPolls } from './dataParser';
export { applyHouseEffects, getPollAdjustmentSummary } from './houseEffectAdjustment';
export { calculateHouseEffects } from './houseEffects';
export { calculateCurrentAverage, calculatePollingAverages } from './pollingAverages';
// Type exports
export type {
    AdjustedPoll,
    AnalysisResult,
    HouseEffects,
    MonthlyBenchmarks,
    ParsedPoll,
    PartyName,
    PollingAverage,
} from './types';
export { PARTY_NAMES } from './types';

export type { CurrentStandings } from './visualization';
export {
    generateStandingsBarChart,
    generateStandingsImage,
    generateStandingsSummary,
    getAdjustmentComparison,
    getCurrentStandings,
    saveStandingsChart,
} from './visualization';
