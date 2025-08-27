import { writeFileSync } from 'node:fs';

/**
 * Refresh polls by fetching latest data from Poll of Polls API
 */
export async function refreshPolls(options: {
    startDate?: string; // Format: YYYY-MM-DD
    endDate?: string;   // Format: YYYY-MM-DD
    outputFile?: string;
} = {}): Promise<void> {
    const {
        startDate = '2025-04-01',
        endDate = '2025-12-31',
        outputFile = './polls.csv'
    } = options;

    console.log('🔄 Refreshing polls from Poll of Polls...');
    console.log(`📅 Date range: ${startDate} to ${endDate}`);
    
    try {
        // Construct the API URL
        const apiUrl = `https://www.pollofpolls.no/lastned.csv?tabell=liste_galluper&type=riks&start=${startDate}&slutt=${endDate}&kommuneid=0`;
        console.log(`🌐 Fetching: ${apiUrl}`);
        
        // Fetch data from Poll of Polls
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch polls: ${response.status} ${response.statusText}`);
        }
        
        const rawContent = await response.text();
        console.log(`📊 Fetched ${rawContent.split('\n').length} lines`);
        
        // Clean encoding issues (same logic as cleanData.ts)
        const cleanedContent = cleanEncodingIssues(rawContent);
        
        // Add the header if it's not already there
        const finalContent = ensureProperHeader(cleanedContent);
        
        // Write to file
        writeFileSync(outputFile, finalContent, 'utf8');
        
        console.log('✅ Polls refreshed successfully!');
        console.log(`📁 Updated: ${outputFile}`);
        
        // Show summary
        const dataLines = finalContent.split('\n')
            .filter(line => line.trim() && !line.includes('Oppslutning') && !line.startsWith('Måling'))
            .length;
        console.log(`📈 Total polls: ${dataLines}`);
        
    } catch (error) {
        console.error('❌ Failed to refresh polls:', error);
        throw error;
    }
}

/**
 * Clean encoding issues in the CSV content
 * (Same logic as src/cleanData.ts)
 */
function cleanEncodingIssues(content: string): string {
    return content
        .replace(/M�ling/g, 'Måling')
        .replace(/H�yre/g, 'Høyre')
        .replace(/R�dt/g, 'Rødt');
}

/**
 * Ensure the CSV has the proper Norwegian header format
 */
function ensureProperHeader(content: string): string {
    const lines = content.split('\n');
    
    // Check if we already have the description header
    if (!content.includes('Oppslutning i prosent')) {
        // Add the Norwegian description header
        const headerLine = 'Oppslutning i prosent. Antall mandater i parentes.\n\n';
        return headerLine + content;
    }
    
    return content;
}

/**
 * Get date range for common periods
 */
export function getDateRange(period: 'current-year' | 'from-april' | 'last-6-months' | 'election-cycle' | 'custom', customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 0-indexed
    const currentDay = now.getDate();
    
    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    switch (period) {
        case 'current-year':
            return {
                startDate: `${currentYear}-01-01`,
                endDate: `${currentYear}-12-31`
            };
        case 'from-april':
            return {
                startDate: `${currentYear}-04-01`,
                endDate: `${currentYear}-12-31`
            };
        case 'last-6-months':
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(now.getMonth() - 6);
            return {
                startDate: formatDate(sixMonthsAgo),
                endDate: formatDate(now)
            };
        case 'election-cycle':
            // Assuming 2025 election cycle
            return {
                startDate: '2023-01-01',
                endDate: '2025-12-31'
            };
        case 'custom':
            if (!customStart || !customEnd) {
                throw new Error('Custom date range requires both startDate and endDate');
            }
            return {
                startDate: customStart,
                endDate: customEnd
            };
        default:
            throw new Error(`Unknown period: ${period}`);
    }
}