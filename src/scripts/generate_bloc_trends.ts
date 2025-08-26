#!/usr/bin/env npx tsx

import { analyzeNorwegianPolls } from '../index';
import { generateBlocTrendData, saveBlocTrendChart } from '../blocTrendVisualization';
import type { WeightingMethod } from '../pollingAverages';

async function generateBlocTrends() {
    console.log('🇳🇴 Norske Stortingsvalg - Blokk-trendanalyse');
    console.log('=============================================\n');

    // Get command line arguments
    const lookbackDays = parseInt(process.argv[2] || '14') || 14;
    const timeframeDays = parseInt(process.argv[3] || '60') || 60;
    const weightingArg = process.argv[4] as WeightingMethod | undefined;
    const weighting: WeightingMethod = weightingArg && ['linear', 'exponential', 'quadratic'].includes(weightingArg) 
        ? weightingArg 
        : 'exponential';
    const modeArg = process.argv[5] as 'seats' | 'votes' | undefined;
    const mode: 'seats' | 'votes' = modeArg === 'votes' ? 'votes' : 'seats';

    try {
        // Load and analyze data
        const analysis = analyzeNorwegianPolls({
            includeAdjustments: true
        });

        if (!analysis.adjustedPolls) {
            console.log('❌ Ingen justerte målinger tilgjengelig');
            process.exit(1);
        }

        console.log(`📊 Genererer blokk-trendkurver...`);
        console.log(`📅 Tidsramme: ${timeframeDays} dager`);
        console.log(`📈 Rullende gjennomsnitt: ${lookbackDays} dager`);
        console.log(`⚖️  Vekting: ${weighting}`);
        console.log(`📈 Modus: ${mode === 'votes' ? 'Oppslutning (%)' : 'Mandater'}`);
        console.log(`🌐 Bruker Poll of Polls (www.pollofpolls.no) for mandatberegning\n`);

        console.log('🔄 Henter historiske mandatprognoser...');
        console.log('(Dette kan ta litt tid på grunn av API-kall)\n');

        // Generate trend data
        const trendData = await generateBlocTrendData(analysis.adjustedPolls, {
            dayStep: 2, // Every 2 days for balance between detail and API calls
            lookbackDays,
            weighting,
            timeframeDays
        });

        if (trendData.length === 0) {
            console.log('❌ Ikke nok data for å generere trend');
            process.exit(1);
        }

        console.log(`✅ Hentet ${trendData.length} datapunker`);

        // Generate filename
        const latestDate = new Date().toISOString().split('T')[0];
        const modeStr = mode === 'votes' ? 'votes' : 'seats';
        const filename = `charts/bloc-trends-${modeStr}-${latestDate}-${lookbackDays}day-${timeframeDays}period.png`;

        // Create chart
        const success = await saveBlocTrendChart(trendData, filename, {
            title: `Utvikling av blokk-${mode === 'votes' ? 'oppslutning' : 'mandater'} (${weighting} vekting)`,
            tension: 0.4, // Cubic spline smoothing
            mode
        });

        if (success) {
            console.log('✅ Blokk-trendkurve generert!');
            console.log(`📁 Fil lagret: ${filename}\n`);

            // Show trend summary
            const firstPoint = trendData[0];
            const lastPoint = trendData[trendData.length - 1];
            
            console.log('📈 Trend-sammendrag:');
            console.log('===================');
            console.log(`📅 Periode: ${firstPoint.date} → ${lastPoint.date}`);
            
            if (mode === 'votes') {
                const redVoteChange = lastPoint.redGreenVoteShare - firstPoint.redGreenVoteShare;
                const blueVoteChange = lastPoint.conservativeVoteShare - firstPoint.conservativeVoteShare;
                console.log(`🔴 Rød-grønn: ${firstPoint.redGreenVoteShare.toFixed(1)}% → ${lastPoint.redGreenVoteShare.toFixed(1)}% (${redVoteChange > 0 ? '+' : ''}${redVoteChange.toFixed(1)}pp)`);
                console.log(`🔵 Borgerlig: ${firstPoint.conservativeVoteShare.toFixed(1)}% → ${lastPoint.conservativeVoteShare.toFixed(1)}% (${blueVoteChange > 0 ? '+' : ''}${blueVoteChange.toFixed(1)}pp)`);
                
                if (lastPoint.redGreenVoteShare >= 50) {
                    console.log('👑 Rød-grønn blokk har flertall i oppslutning!');
                } else if (lastPoint.conservativeVoteShare >= 50) {
                    console.log('👑 Borgerlig blokk har flertall i oppslutning!');
                } else {
                    console.log('⚖️  Ingen blokk har flertall i oppslutning');
                }
            } else {
                const redChange = lastPoint.redGreenSeats - firstPoint.redGreenSeats;
                const blueChange = lastPoint.conservativeSeats - firstPoint.conservativeSeats;
                console.log(`🔴 Rød-grønn: ${firstPoint.redGreenSeats} → ${lastPoint.redGreenSeats} mandater (${redChange > 0 ? '+' : ''}${redChange})`);
                console.log(`🔵 Borgerlig: ${firstPoint.conservativeSeats} → ${lastPoint.conservativeSeats} mandater (${blueChange > 0 ? '+' : ''}${blueChange})`);
                
                if (lastPoint.redGreenSeats >= 85) {
                    console.log('👑 Rød-grønn blokk har flertall i mandater!');
                } else if (lastPoint.conservativeSeats >= 85) {
                    console.log('👑 Borgerlig blokk har flertall i mandater!');
                } else {
                    console.log('⚖️  Ingen blokk har flertall');
                }
            }

        } else {
            console.log('❌ Kunne ikke generere blokk-trendkurve');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Feil ved generering av blokk-trendkurve:', error);
        process.exit(1);
    }
}

// Show usage if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('🇳🇴 Norske Stortingsvalg - Blokk-trendanalyse');
    console.log('Bruk: npx tsx src/scripts/generate_bloc_trends.ts [lookback_dager] [tidsramme_dager] [vekting] [modus]');
    console.log('');
    console.log('Genererer tidsserie-kurver som viser utvikling av blokker over tid:');
    console.log('• Dual-line chart med rød-grønn vs borgerlig blokk');
    console.log('• Rullende gjennomsnitt med valgbar vekting');
    console.log('• Kubisk spline-interpolering for glatte kurver');
    console.log('• Flertallslinje (85 mandater eller 50% oppslutning)');
    console.log('• Poll of Polls API for offisiell mandatberegning');
    console.log('• Valgbar visning: mandater eller oppslutning');
    console.log('');
    console.log('Eksempler:');
    console.log('  npx tsx src/scripts/generate_bloc_trends.ts                  # Mandater, 14-dagers lookback');
    console.log('  npx tsx src/scripts/generate_bloc_trends.ts 7 90             # 7-dagers lookback, 90 dager historikk');
    console.log('  npx tsx src/scripts/generate_bloc_trends.ts 14 30 linear     # Linear vekting');
    console.log('  npx tsx src/scripts/generate_bloc_trends.ts 14 60 exponential votes  # Oppslutning i stedet for mandater');
    console.log('');
    console.log('Argumenter:');
    console.log('  lookback_dager   Rullende gjennomsnitt dager (standard: 14)');
    console.log('  tidsramme_dager  Hvor langt tilbake i tid (standard: 60)');
    console.log('  vekting          Vektingsmetode: exponential (standard), linear, quadratic');
    console.log('  modus            Visning: seats (standard) eller votes');
    process.exit(0);
}

// Run the bloc trend generator
generateBlocTrends();