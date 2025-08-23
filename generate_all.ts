#!/usr/bin/env npx tsx

import { readFileSync } from 'node:fs';
import { analyzeNorwegianPolls, getCurrentStandings } from './src/index';
import { fetchSeatProjections, calculateBlocAnalysis } from './src/pollOfPollsApi';
import { generateCombinedChart } from './src/combinedVisualization';

async function generateAll() {
    console.log('🇳🇴 Norske Stortingsvalg - Komplett Analyse');
    console.log('==========================================\n');

    // Get command line arguments
    const lookbackDays = parseInt(process.argv[2] || '14') || 14;
    const outputPath = process.argv[3] || `charts/complete-${new Date().toISOString().split('T')[0]}-${lookbackDays}day.png`;
    
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

        console.log(`📊 Genererer komplett analyse med ${lookbackDays}-dagers tilbakeblikk...`);
        console.log(`🌐 Bruker Poll of Polls (www.pollofpolls.no) for mandatberegning`);
        console.log(`💾 Lagrer til: ${outputPath}\n`);

        // Fetch seat projections and calculate bloc analysis
        const seatProjection = await fetchSeatProjections(standings);
        const blocAnalysis = calculateBlocAnalysis(seatProjection);

        // Generate combined chart
        await generateCombinedChart(standings, blocAnalysis, outputPath, seatProjection);

        console.log('✅ Komplett analyse generert!');
        console.log(`📁 Fil lagret: ${outputPath}`);
        
        // Show summary
        const redBloc = blocAnalysis.blocs.red;
        const blueBloc = blocAnalysis.blocs.blue;
        
        console.log('\n📈 Sammendrag:');
        console.log('==============');
        console.log(`🔴 Rød-grønn blokk: ${redBloc.seats} mandater (${redBloc.percentage.toFixed(1)}%)`);
        console.log(`🔵 Borgerlig blokk: ${blueBloc.seats} mandater (${blueBloc.percentage.toFixed(1)}%)`);
        
        if (redBloc.hasMajority) {
            console.log('👑 Rød-grønn blokk har flertall!');
        } else if (blueBloc.hasMajority) {
            console.log('👑 Borgerlig blokk har flertall!');
        } else {
            console.log('⚖️  Ingen blokk har flertall');
        }
        
        console.log(`🏠 Institutter: ${standings.houses.join(', ')}`);

    } catch (error) {
        console.error('❌ Feil ved generering av komplett analyse:', error);
        process.exit(1);
    }
}

// Show usage if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('🇳🇴 Norske Stortingsvalg - Komplett Analyse');
    console.log('Bruk: npx tsx generate_all.ts [tilbakeblikk_dager] [output_fil]');
    console.log('');
    console.log('Genererer komplett analyse med både meningsmålinger og blokk-fordeling:');
    console.log('• Kombinerer polling-diagram og mandatfordeling');
    console.log('• Viser rød-grønn vs borgerlig blokk visuelt');
    console.log('• Bruker Poll of Polls for offisiell mandatberegning');
    console.log('• Lagrer som PNG-fil');
    console.log('');
    console.log('Eksempler:');
    console.log('  npx tsx generate_all.ts                    # 14-dagers tilbakeblikk');
    console.log('  npx tsx generate_all.ts 7                  # 7-dagers tilbakeblikk');
    console.log('  npx tsx generate_all.ts 14 analysis.png    # Custom filnavn');
    console.log('');
    console.log('Argumenter:');
    console.log('  tilbakeblikk_dager  Antall dager å inkludere (standard: 14)');
    console.log('  output_fil          Filnavn for PNG (standard: auto-generert)');
    process.exit(0);
}

// Run the complete analysis
generateAll();