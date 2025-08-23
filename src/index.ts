// Main exports
export { analyzeNorwegianPolls } from './analysis';
export { parseNorwegianPolls } from './dataParser';
export { calculateHouseEffects } from './houseEffects';
export { applyHouseEffects, getPollAdjustmentSummary } from './houseEffectAdjustment';
export { calculatePollingAverages, calculateCurrentAverage } from './pollingAverages';

// Type exports
export type {
    PartyName,
    ParsedPoll,
    AdjustedPoll,
    PollingAverage,
    MonthlyBenchmarks,
    HouseEffects,
    AnalysisResult
} from '../types';

export { PARTY_NAMES } from '../types';