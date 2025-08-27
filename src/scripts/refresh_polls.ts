#!/usr/bin/env npx tsx

import { refreshPolls, getDateRange } from '../pollRefresh';

async function main() {
    console.log('🇳🇴 Norske Meningsmålinger - Poll Refresh');
    console.log('==========================================\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const period = args[0] as 'current-year' | 'from-april' | 'last-6-months' | 'election-cycle' | 'custom' | undefined;
    const customStart = args[1];
    const customEnd = args[2];
    const outputFile = args[3];

    try {
        let dateRange;
        
        if (period) {
            dateRange = getDateRange(period, customStart, customEnd);
            console.log(`📅 Using ${period} date range`);
        } else {
            // Default to from April
            dateRange = getDateRange('from-april');
            console.log('📅 Using from-april (default)');
        }

        await refreshPolls({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            outputFile
        });

        console.log('\n🎉 Poll refresh completed successfully!');
        console.log('💡 You can now use the updated polls in your analysis.');
        
    } catch (error) {
        console.error('\n❌ Poll refresh failed:', error);
        process.exit(1);
    }
}

// Show usage if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('🇳🇴 Norske Meningsmålinger - Poll Refresh');
    console.log('==========================================');
    console.log('');
    console.log('Fetches the latest polling data from Poll of Polls (www.pollofpolls.no)');
    console.log('Cleans encoding issues and stores to polls.csv');
    console.log('');
    console.log('Usage: npx tsx src/scripts/refresh_polls.ts [period] [start] [end] [output]');
    console.log('');
    console.log('Periods:');
    console.log('  from-april        Fetch polls from April 1st to end of year (default)');
    console.log('  current-year      Fetch polls from entire current year');
    console.log('  last-6-months     Fetch polls from last 6 months');
    console.log('  election-cycle    Fetch polls from 2023-2025 election cycle');
    console.log('  custom            Custom date range (requires start and end dates)');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx src/scripts/refresh_polls.ts                           # From April (default)');
    console.log('  npx tsx src/scripts/refresh_polls.ts current-year              # Full current year');
    console.log('  npx tsx src/scripts/refresh_polls.ts last-6-months             # Last 6 months');
    console.log('  npx tsx src/scripts/refresh_polls.ts election-cycle            # Full election cycle');
    console.log('  npx tsx src/scripts/refresh_polls.ts custom 2025-01-01 2025-08-31  # Custom range');
    console.log('  npx tsx src/scripts/refresh_polls.ts from-april "" "" polls_backup.csv  # Custom output');
    console.log('');
    console.log('Arguments:');
    console.log('  period    Date range period (optional, default: from-april)');
    console.log('  start     Start date for custom period (YYYY-MM-DD)');
    console.log('  end       End date for custom period (YYYY-MM-DD)');
    console.log('  output    Output file path (optional, default: ./polls.csv)');
    process.exit(0);
}

// Run the refresh
main();