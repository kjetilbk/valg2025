export type PartyName =
    | 'Ap'
    | 'Høyre'
    | 'Frp'
    | 'SV'
    | 'Sp'
    | 'KrF'
    | 'Venstre'
    | 'MDG'
    | 'Rødt'
    | 'Andre';

export interface ParsedPoll {
    house: string;
    date: string;
    parsedDate: Date;
    month: number;
    year: number;
    day: number;
    parties: Record<PartyName, number>;
}

export interface PollWithDeviations extends ParsedPoll {
    monthlyDeviations?: Record<string, number>;
}

export interface MonthlyBenchmarks {
    [month: number]: Record<string, number>;
}

export interface HouseEffect extends Partial<Record<PartyName, number>> {
    pollCount: number;
}

export interface HouseEffects {
    [house: string]: HouseEffect;
}

export interface AdjustedPoll extends ParsedPoll {
    originalParties: Record<PartyName, number>;
    adjustments: Partial<Record<PartyName, number>>;
}

export interface PollingAverage {
    date: string;
    parsedDate: Date;
    timeSpan: string;
    pollCount: number;
    parties: Record<PartyName, number>;
    houses: string[];
}

export interface AnalysisResult {
    polls: ParsedPoll[];
    monthlyBenchmarks: MonthlyBenchmarks;
    houseEffects: HouseEffects;
    adjustedPolls?: AdjustedPoll[];
    averages?: PollingAverage[];
    summary: {
        totalPolls: number;
        dateRange: {
            earliest: string;
            latest: string;
        };
        pollsters: string[];
        months: number[];
    };
}

export const PARTY_NAMES: PartyName[] = [
    'Rødt',
    'SV',
    'Ap',
    'Sp',
    'MDG',
    'KrF',
    'Venstre',
    'Høyre',
    'Frp',
    'Andre',
];

export interface CurrentStandings {
    date: string;
    lookbackDays: number;
    pollCount: number;
    houses: string[];
    standings: Array<{
        party: PartyName;
        displayName: string;
        percentage: number;
    }>;
}

/**
 * Seat projection results using Sainte-Laguë method
 */
export interface SeatProjection {
    date: string;
    lookbackDays: number;
    pollCount: number;
    houses: string[];
    totalSeats: number;
    threshold: number;
    eligibleParties: number;
    thresholdParties: number;
    projections: Array<{
        party: PartyName;
        displayName: string;
        percentage: number;
        seats: number;
        aboveThreshold: boolean;
    }>;
}

/**
 * Political bloc analysis
 */
export interface BlocAnalysis {
    date: string;
    lookbackDays: number;
    pollCount: number;
    houses: string[];
    totalSeats: number;
    majority: number;
    blocs: {
        red: BlocInfo;
        blue: BlocInfo;
        other: BlocInfo;
    };
}

export interface BlocInfo {
    name: string;
    parties: readonly string[];
    seats: number;
    percentage: number;
    hasMajority: boolean;
}
