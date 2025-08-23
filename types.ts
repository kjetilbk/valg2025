export type PartyName = 'Ap' | 'Høyre' | 'Frp' | 'SV' | 'Sp' | 'KrF' | 'Venstre' | 'MDG' | 'Rødt' | 'Andre';

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

export interface AnalysisResult {
    polls: ParsedPoll[];
    monthlyBenchmarks: MonthlyBenchmarks;
    houseEffects: HouseEffects;
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

export const PARTY_NAMES: PartyName[] = ['Ap', 'Høyre', 'Frp', 'SV', 'Sp', 'KrF', 'Venstre', 'MDG', 'Rødt', 'Andre'];