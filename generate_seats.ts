#!/usr/bin/env npx tsx

import { readFileSync } from 'node:fs';
import { analyzeNorwegianPolls, getCurrentStandings } from './src/index';
import { fetchSeatProjections } from './src/pollOfPollsApi';
import { generateSeatProjectionChart } from './src/seatVisualization';

async function generateSeats() {
    console.log('🇳🇴 Norske Stortingsvalg - Mandatprognose');
    console.log('========================================\n');

    // Get command line arguments for lookback days
    const lookbackDays = parseInt(process.argv[2] || '14', 10) || 14;
    
    try {
        // Load and analyze data
        const csvContent = readFileSync('./polls.csv', 'utf8');
        const analysis = analyzeNorwegianPolls(csvContent, {
            includeAdjustments: true
        });

        if (!analysis.adjustedPolls) {
            console.log('❌ Ingen justerte målinger tilgjengelig');
            process.exit(1);
        }

        // Get current standings
        const standings = getCurrentStandings(analysis.adjustedPolls, lookbackDays, { sortByPercentage: false });
        
        if (!standings) {
            console.log('❌ Ingen måledata tilgjengelig for angitt tidsramme');
            process.exit(1);
        }

        console.log(`🗳️  Beregner mandater med ${lookbackDays}-dagers tilbakeblikk...`);
        console.log(`🌐 Bruker Poll of Polls (www.pollofpolls.no) for offisiell beregning\n`);

        // Fetch seat projections from Poll of Polls
        const seatProjection = await fetchSeatProjections(standings);
        
        console.log('📈 Mandatprognose:');
        console.log('==================');
        console.log(generateSeatProjectionChart(seatProjection));

        // Show summary stats
        const eligibleParties = seatProjection.projections.filter(p => p.aboveThreshold);
        const thresholdParties = seatProjection.projections.filter(p => !p.aboveThreshold && p.percentage > 0);
        
        console.log(`📋 Over sperregrensa: ${eligibleParties.length} partier`);
        if (thresholdParties.length > 0) {
            console.log(`⚠️  Under sperregrensa: ${thresholdParties.map(p => `${p.displayName} (${p.percentage.toFixed(1)}%)`).join(', ')}`);
        }
        console.log(`🏠 Institutter: ${seatProjection.houses.join(', ')}`);

    } catch (error) {
        console.error('❌ Feil ved beregning av mandater:', error);
        process.exit(1);
    }
}

// Show usage if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('🇳🇴 Norske Stortingsvalg - Mandatprognose');
    console.log('Bruk: npx tsx generate_seats.ts [tilbakeblikk_dager]');
    console.log('');
    console.log('Beregner mandatfordeling i Stortinget basert på meningsmålinger:');
    console.log('• Bruker Poll of Polls (www.pollofpolls.no) for offisiell beregning');
    console.log('• Samme metode som brukes av norske medier');
    console.log('• 4% sperregrense for partier');
    console.log('• 169 mandater totalt');
    console.log('• House effects justert automatisk');
    console.log('');
    console.log('Eksempler:');
    console.log('  npx tsx generate_seats.ts        # 14-dagers tilbakeblikk');
    console.log('  npx tsx generate_seats.ts 7      # 7-dagers tilbakeblikk');
    console.log('  npx tsx generate_seats.ts 21     # 21-dagers tilbakeblikk');
    console.log('');
    console.log('Argumenter:');
    console.log('  tilbakeblikk_dager  Antall dager å inkludere (standard: 14)');
    process.exit(0);
}

// Run the seat calculation
generateSeats();