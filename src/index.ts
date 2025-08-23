// Main exports
export { analyzeNorwegianPolls } from './analysis';
export { parseNorwegianPolls } from './dataParser';
export { calculateHouseEffects } from './houseEffects';

// Type exports
export type {
    PartyName,
    ParsedPoll,
    MonthlyBenchmarks,
    HouseEffects,
    AnalysisResult
} from '../types';

export { PARTY_NAMES } from '../types';