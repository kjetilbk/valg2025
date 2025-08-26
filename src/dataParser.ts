import * as Papa from 'papaparse';
import { readFileSync, existsSync } from 'node:fs';
import type { ParsedPoll, PartyName } from './types';
import { PARTY_NAMES } from './types';

/**
 * Parse Norwegian date format (DD/M-YYYY) to Date object
 */
function parseNorwegianDate(dateString: string): {
    parsedDate: Date;
    day: number;
    month: number;
    year: number;
} {
    const match = dateString.match(/(\d{1,2})\/(\d{1,2})-(\d{4})/)!;
    const [, dayStr, monthStr, yearStr] = match;
    const day = parseInt(dayStr!, 10);
    const month = parseInt(monthStr!, 10);
    const year = parseInt(yearStr!, 10);

    return {
        parsedDate: new Date(year, month - 1, day), // JS Date months are 0-indexed
        day,
        month,
        year,
    };
}

/**
 * Extract percentage from format "26,7 (50)" -> 26.7
 */
function extractPercentage(value: string): number {
    // Get the part before the space and parentheses
    const percentageStr = value.split(' ')[0]!;
    // Replace comma with dot for parsing
    return parseFloat(percentageStr.replace(',', '.'));
}

function getColumnValue(row: Record<string, string>, partyName: PartyName): string {
    return row[partyName]!; // Direct access since data is clean
}

function parseRow(row: Record<string, string>): ParsedPoll {
    const fullHouseName = row.Måling!.trim();
    const house = fullHouseName.split('/')[0]!.trim(); // Extract just the polling house
    const dateStr = row.Dato!.trim();
    const dateInfo = parseNorwegianDate(dateStr);

    const parties: Record<PartyName, number> = {} as Record<PartyName, number>;

    for (const partyName of PARTY_NAMES) {
        const value = getColumnValue(row, partyName);
        const percentage = extractPercentage(value);
        parties[partyName] = percentage;
    }

    return {
        house,
        date: dateStr,
        parsedDate: dateInfo.parsedDate,
        month: dateInfo.month,
        year: dateInfo.year,
        day: dateInfo.day,
        parties,
    };
}

/**
 * Parse CSV content into structured poll data
 */
export function parseNorwegianPolls(csvContent: string): ParsedPoll[] {
    const lines = csvContent.split('\n');
    const dataStartIndex = lines.findIndex((line) => line.includes('Måling'));

    const dataLines = lines.slice(dataStartIndex).join('\n');
    const parseResult = Papa.parse<Record<string, string>>(dataLines, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
    });

    const polls = parseResult.data.map((row) => parseRow(row!));
    polls.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    return polls;
}

/**
 * Load and merge polls from both regular and unreleased files
 */
export function loadAllPolls(): ParsedPoll[] {
    // Load regular polls
    const regularCsv = readFileSync('./polls.csv', 'utf8');
    
    // Load unreleased polls if they exist
    let combinedCsv = regularCsv;
    if (existsSync('./unreleased_polls.csv')) {
        const unreleasedCsv = readFileSync('./unreleased_polls.csv', 'utf8');
        
        // Extract just the data lines from unreleased polls (skip headers)
        const unreleasedLines = unreleasedCsv.split('\n');
        const unreleasedDataStart = unreleasedLines.findIndex((line) => line.includes('Måling'));
        
        if (unreleasedDataStart >= 0) {
            const unreleasedDataLines = unreleasedLines.slice(unreleasedDataStart + 1)
                .filter(line => line.trim() && !line.includes('Måling'));
            
            if (unreleasedDataLines.length > 0) {
                // Append unreleased data to regular polls
                combinedCsv = regularCsv.trim() + '\n' + unreleasedDataLines.join('\n');
            }
        }
    }
    
    return parseNorwegianPolls(combinedCsv);
}
