#!/usr/bin/env npx tsx

import { analyzeNorwegianPolls, getCurrentStandings, saveStandingsChart, generateStandingsBarChart } from '../index';
import type { WeightingMethod } from '../pollingAverages';

async function generateChart() {
    console.log('🇳🇴 Norske Meningsmålinger - Diagramgenerator');
    console.log('===============================================\n');

    // Get command line arguments
    const lookbackDays = parseInt(process.argv[2] || '14', 10) || 14;
    const weightingArg = process.argv[4] as WeightingMethod | undefined;
    const weighting: WeightingMethod = weightingArg && ['linear', 'exponential', 'quadratic'].includes(weightingArg) 
        ? weightingArg 
        : 'none';
    
    try {
        // Load and analyze data first to get latest poll date
        const analysis = analyzeNorwegianPolls({
            includeAdjustments: true
        });

        if (!analysis.adjustedPolls) {
            console.log('❌ Ingen justerte målinger tilgjengelig');
            process.exit(1);
        }

        // Get current standings (keep original party order as in PARTY_NAMES)
        const standings = getCurrentStandings(analysis.adjustedPolls, lookbackDays, { 
            sortByPercentage: false,
            weighting
        });
        
        if (!standings) {
            console.log('❌ Ingen måledata tilgjengelig for angitt tidsramme');
            process.exit(1);
        }

        // Generate filename if not provided
        let filename = process.argv[3];
        if (!filename) {
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
            filename = `charts/polling-${formattedDate}-${lookbackDays}day.png`;
        }

        console.log(`📊 Genererer diagram med ${lookbackDays}-dagers tilbakeblikk...`);
        if (weighting !== 'none') {
            console.log(`⚖️  Vekting: ${weighting} (nyere målinger gis mer vekt)`);
        }
        console.log(`💾 Utdatafil: ${filename}\n`);

        console.log('📈 Nåværende Stilling:');
        console.log('======================');
        console.log(generateStandingsBarChart(standings));

        // Try to save as PNG
        console.log('🎨 Genererer PNG-diagram...');
        
        const success = await saveStandingsChart(standings, filename, {
            width: 1000,
            height: 700,
            title: `Norske Meningsmålinger - Nåværende Stilling (${standings.date})`
        });

        if (success) {
            console.log(`✅ Diagram lagret som: ${filename}`);
            console.log(`📋 Basert på ${standings.pollCount} målinger fra ${standings.houses.length} institutter`);
            console.log(`🏠 Institutter: ${standings.houses.join(', ')}`);
        } else {
            console.log('⚠️  Kunne ikke generere PNG-bilde');
            console.log('   Dette kan være fordi Chart.js native avhengigheter ikke er kompilert');
            console.log('   Prøv å kjøre: pnpm rebuild canvas');
            console.log('   Eller installer systemavhengigheter for canvas (varierer per OS)');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Feil ved generering av diagram:', error);
        process.exit(1);
    }
}

// Show usage if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('🇳🇴 Norske Meningsmålinger - Diagramgenerator');
    console.log('Bruk: npx tsx src/scripts/generate_chart.ts [tilbakeblikk_dager] [utdatafil] [vekting]');
    console.log('');
    console.log('Genererer house-effect-justerte meningsmålingdiagrammer med:');
    console.log('• Vertikale søyler (går oppover fra bunnen)');
    console.log('• Partietiketter på bunnnaksen');  
    console.log('• Dataverdier vist på toppen av hver søyle');
    console.log('• Blokk-sortert partirekkefølge (Rødt→SV→Ap→Sp→MDG→Andre→KrF→Venstre→Høyre→Frp)');
    console.log('• Norske partifarger');
    console.log('• Valgfri vekting av nyere målinger');
    console.log('');
    console.log('Eksempler:');
    console.log('  npx tsx src/scripts/generate_chart.ts                           # 14-dagers tilbakeblikk, ingen vekting');
    console.log('  npx tsx src/scripts/generate_chart.ts 7                         # 7-dagers tilbakeblikk, ingen vekting');
    console.log('  npx tsx src/scripts/generate_chart.ts 14 poll.png               # Tilpasset filnavn');
    console.log('  npx tsx src/scripts/generate_chart.ts 14 poll.png exponential   # Eksponentiell vekting');
    console.log('  npx tsx src/scripts/generate_chart.ts 21 "" linear              # Linear vekting, auto-filnavn');
    console.log('');
    console.log('Argumenter:');
    console.log('  tilbakeblikk_dager  Antall dager å inkludere (standard: 14)');
    console.log('  utdatafil          PNG-filnavn (standard: auto-generert med polldato)');
    console.log('  vekting            Vektingsmetode: none (standard), linear, exponential, quadratic');
    process.exit(0);
}

// Run the chart generator
generateChart().catch(console.error);