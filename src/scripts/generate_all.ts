#!/usr/bin/env npx tsx

import { analyzeNorwegianPolls, getCurrentStandings } from '../index';
import { fetchSeatProjections, calculateBlocAnalysis } from '../pollOfPollsApi';
import { generateCombinedChart } from '../combinedVisualization';
import type { WeightingMethod } from '../pollingAverages';

async function generateAll() {
    console.log('🇳🇴 Norske Stortingsvalg - Komplett Analyse');
    console.log('==========================================\n');

    // Get command line arguments
    const lookbackDays = parseInt(process.argv[2] || '14') || 14;
    const weightingArg = process.argv[4] as WeightingMethod | undefined;
    const weighting: WeightingMethod = weightingArg && ['linear', 'exponential', 'quadratic'].includes(weightingArg) 
        ? weightingArg 
        : 'none';
    
    try {
        // Load and analyze data
        const analysis = analyzeNorwegianPolls({
            includeAdjustments: true
        });

        if (!analysis.adjustedPolls) {
            console.log('❌ Ingen justerte målinger tilgjengelig');
            process.exit(1);
        }

        // Get current standings
        const standings = getCurrentStandings(analysis.adjustedPolls, lookbackDays, { 
            sortByPercentage: false,
            weighting
        });
        
        if (!standings) {
            console.log('❌ Ingen måledata tilgjengelig for angitt tidsramme');
            process.exit(1);
        }

        // Generate filename if not provided, using date from latest poll
        let outputPath = process.argv[3];
        if (!outputPath) {
            // Format the date from the standings (e.g., "22/8-2025" -> "2025-08-22")
            const dateStr = standings.date;
            const dateParts = dateStr.split('-');
            const dayMonth = dateParts[0];
            const year = dateParts[1];
            
            if (!dayMonth || !year) {
                throw new Error(`Invalid date format: ${dateStr}`);
            }
            
            const dayMonthParts = dayMonth.split('/');
            const day = dayMonthParts[0];
            const month = dayMonthParts[1];
            
            if (!day || !month) {
                throw new Error(`Invalid day/month format: ${dayMonth}`);
            }
            
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            outputPath = `charts/complete-${formattedDate}-${lookbackDays}day.png`;
        }

        console.log(`📊 Genererer komplett analyse med ${lookbackDays}-dagers tilbakeblikk...`);
        if (weighting !== 'none') {
            console.log(`⚖️  Vekting: ${weighting} (nyere målinger gis mer vekt)`);
        }
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
    console.log('Bruk: npx tsx src/scripts/generate_all.ts [tilbakeblikk_dager] [output_fil] [vekting]');
    console.log('');
    console.log('Genererer komplett analyse med både meningsmålinger og blokk-fordeling:');
    console.log('• Kombinerer polling-diagram og mandatfordeling');
    console.log('• Viser rød-grønn vs borgerlig blokk visuelt');
    console.log('• Bruker Poll of Polls for offisiell mandatberegning');
    console.log('• Lagrer som PNG-fil');
    console.log('• Valgfri vekting av nyere målinger');
    console.log('');
    console.log('Eksempler:');
    console.log('  npx tsx src/scripts/generate_all.ts                         # 14-dagers tilbakeblikk');
    console.log('  npx tsx src/scripts/generate_all.ts 7                       # 7-dagers tilbakeblikk');
    console.log('  npx tsx src/scripts/generate_all.ts 14 analysis.png         # Custom filnavn');
    console.log('  npx tsx src/scripts/generate_all.ts 14 "" exponential       # Eksponentiell vekting');
    console.log('  npx tsx src/scripts/generate_all.ts 21 analysis.png linear  # Linear vekting');
    console.log('');
    console.log('Argumenter:');
    console.log('  tilbakeblikk_dager  Antall dager å inkludere (standard: 14)');
    console.log('  output_fil          Filnavn for PNG (standard: auto-generert med polldato)');
    console.log('  vekting            Vektingsmetode: none (standard), linear, exponential, quadratic');
    process.exit(0);
}

// Run the complete analysis
generateAll();