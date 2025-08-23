import type { ParsedPoll, AdjustedPoll, PollingAverage } from '../types';
import { PARTY_NAMES } from '../types';

/**
 * Calculate polling averages for different time spans using adjusted polls
 */
export function calculatePollingAverages(
    adjustedPolls: AdjustedPoll[], 
    options: {
        timeSpanDays?: number;
        stepDays?: number;
        endDate?: Date;
    } = {}
): PollingAverage[] {
    const { timeSpanDays = 14, stepDays = 7, endDate = new Date() } = options;
    
    const sortedPolls = [...adjustedPolls].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    
    if (sortedPolls.length === 0) return [];
    
    const earliestDate = sortedPolls[0]!.parsedDate;
    const latestDate = sortedPolls[sortedPolls.length - 1]!.parsedDate;
    
    // Use the latest poll date or provided end date, whichever is earlier
    const actualEndDate = endDate > latestDate ? latestDate : endDate;
    
    const averages: PollingAverage[] = [];
    const timeSpanMs = timeSpanDays * 24 * 60 * 60 * 1000;
    const stepMs = stepDays * 24 * 60 * 60 * 1000;
    
    // Start from earliest date + timeSpan to ensure we have a full window
    let currentDate = new Date(earliestDate.getTime() + timeSpanMs);
    
    while (currentDate <= actualEndDate) {
        const windowStart = new Date(currentDate.getTime() - timeSpanMs);
        const windowEnd = currentDate;
        
        const windowPolls = sortedPolls.filter(poll => 
            poll.parsedDate >= windowStart && poll.parsedDate <= windowEnd
        );
        
        if (windowPolls.length > 0) {
            const average = calculateAverageForPolls(windowPolls, {
                date: formatDate(currentDate),
                parsedDate: new Date(currentDate),
                timeSpan: `${timeSpanDays} days ending ${formatDate(currentDate)}`
            });
            
            averages.push(average);
        }
        
        currentDate = new Date(currentDate.getTime() + stepMs);
    }
    
    return averages;
}

/**
 * Calculate a simple average from a set of polls (useful for current snapshot)
 */
export function calculateCurrentAverage(adjustedPolls: AdjustedPoll[], days: number = 14): PollingAverage | null {
    if (adjustedPolls.length === 0) return null;
    
    const sortedPolls = [...adjustedPolls].sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());
    const latestDate = sortedPolls[0]!.parsedDate;
    const cutoffDate = new Date(latestDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    const recentPolls = sortedPolls.filter(poll => poll.parsedDate >= cutoffDate);
    
    if (recentPolls.length === 0) return null;
    
    return calculateAverageForPolls(recentPolls, {
        date: formatDate(latestDate),
        parsedDate: latestDate,
        timeSpan: `Current (${days} days)`
    });
}

/**
 * Helper function to calculate average from a group of polls
 */
function calculateAverageForPolls(
    polls: AdjustedPoll[], 
    metadata: { date: string; parsedDate: Date; timeSpan: string }
): PollingAverage {
    const parties: Record<string, number> = {};
    const houses = Array.from(new Set(polls.map(p => p.house)));
    
    for (const party of PARTY_NAMES) {
        const values = polls
            .map(poll => poll.parties[party])
            .filter((val): val is number => val !== undefined && !isNaN(val));
        
        if (values.length > 0) {
            parties[party] = values.reduce((sum, val) => sum + val, 0) / values.length;
        }
    }
    
    return {
        date: metadata.date,
        parsedDate: metadata.parsedDate,
        timeSpan: metadata.timeSpan,
        pollCount: polls.length,
        parties,
        houses
    };
}

/**
 * Format date as DD/M-YYYY to match Norwegian format
 */
function formatDate(date: Date): string {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}-${year}`;
}