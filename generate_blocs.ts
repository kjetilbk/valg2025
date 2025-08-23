#!/usr/bin/env npx tsx

import { readFileSync } from 'node:fs';
import { analyzeNorwegianPolls, getCurrentStandings } from './src/index';
import { fetchSeatProjections, calculateBlocAnalysis } from './src/pollOfPollsApi';
import { generateBlocChart, generateBlocSummary } from './src/seatVisualization';

async function generateBlocs() {
    console.log('🇳🇴 Norske Stortingsvalg - Blokk-analyse');
    console.log('=======================================\n');

    // Get command line arguments for lookback days
    const lookbackDays = parseInt(process.argv[2]) || 14;
    
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

        console.log(`🔴🔵 Analyserer blokker med ${lookbackDays}-dagers tilbakeblikk...`);
        console.log(`🌐 Bruker Poll of Polls (www.pollofpolls.no) for offisiell beregning\n`);

        // Fetch seat projections from Poll of Polls and calculate bloc analysis
        const seatProjection = await fetchSeatProjections(standings);
        const blocAnalysis = calculateBlocAnalysis(seatProjection);
        
        console.log('📈 Blokk-analyse:');
        console.log('================');
        console.log(generateBlocChart(blocAnalysis));

        // Show detailed breakdown
        const redBloc = blocAnalysis.blocs.red;
        const blueBloc = blocAnalysis.blocs.blue;
        const otherBloc = blocAnalysis.blocs.other;
        
        console.log('\n🔍 Detaljert oversikt:');
        
        if (redBloc.hasMajority) {
            console.log('👑 Rød-grønn blokk har flertall!');
        } else if (blueBloc.hasMajority) {
            console.log('👑 Borgerlig blokk har flertall!');
        } else {
            console.log('⚖️  Ingen blokk har flertall - trengs støttepartier');
        }
        
        console.log(`📋 Krever ${blocAnalysis.majority} mandater for flertall av ${blocAnalysis.totalSeats}`);
        console.log(`🏠 Institutter: ${blocAnalysis.houses.join(', ')}`);

    } catch (error) {
        console.error('❌ Feil ved blokk-analyse:', error);
        process.exit(1);
    }
}

// Show usage if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('🇳🇴 Norske Stortingsvalg - Blokk-analyse');
    console.log('Bruk: npx tsx generate_blocs.ts [tilbakeblikk_dager]');
    console.log('');
    console.log('Analyserer politiske blokker basert på mandatprognose:');
    console.log('• Rød-grønn blokk: Ap, SV, Sp, Rødt, MDG');
    console.log('• Borgerlig blokk: Høyre, Frp, KrF, Venstre');  
    console.log('• Bruker Poll of Polls (www.pollofpolls.no) for offisiell beregning');
    console.log('• Samme metode som brukes av norske medier');
    console.log('• Flertall: 85 av 169 mandater');
    console.log('');
    console.log('Eksempler:');
    console.log('  npx tsx generate_blocs.ts        # 14-dagers tilbakeblikk');
    console.log('  npx tsx generate_blocs.ts 7      # 7-dagers tilbakeblikk');
    console.log('  npx tsx generate_blocs.ts 21     # 21-dagers tilbakeblikk');
    console.log('');
    console.log('Argumenter:');
    console.log('  tilbakeblikk_dager  Antall dager å inkludere (standard: 14)');
    process.exit(0);
}

// Run the bloc analysis
generateBlocs();