#!/usr/bin/env npx tsx

import { readFileSync } from 'fs';
import { analyzeNorwegianPolls, getCurrentStandings, saveStandingsChart, generateStandingsBarChart } from './src/index';

async function generateChart() {
    console.log('🇳🇴 Norwegian Election Polling - Chart Generator');
    console.log('================================================\n');

    // Get command line arguments for lookback days
    const lookbackDays = parseInt(process.argv[2]) || 14;
    
    try {
        // Load and analyze data first to get latest poll date
        const csvContent = readFileSync('./polls.csv', 'utf8');
        const analysis = analyzeNorwegianPolls(csvContent, {
            includeAdjustments: true
        });

        if (!analysis.adjustedPolls) {
            console.log('❌ No adjusted polls available');
            process.exit(1);
        }

        // Get current standings (keep original party order as in PARTY_NAMES)
        const standings = getCurrentStandings(analysis.adjustedPolls, lookbackDays, { sortByPercentage: false });
        
        if (!standings) {
            console.log('❌ No polling data available for the specified timeframe');
            process.exit(1);
        }

        // Generate filename if not provided
        let filename = process.argv[3];
        if (!filename) {
            // Format the date from the standings (e.g., "22/8-2025" -> "2025-08-22")
            const dateStr = standings.date;
            const [dayMonth, year] = dateStr.split('-');
            const [day, month] = dayMonth.split('/');
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            
            filename = `charts/polling-${formattedDate}-${lookbackDays}day.png`;
        }

        console.log(`📊 Generating chart with ${lookbackDays}-day lookback...`);
        console.log(`💾 Output file: ${filename}\n`);

        console.log('📈 Current Standings:');
        console.log('=====================');
        console.log(generateStandingsBarChart(standings));

        // Try to save as PNG
        console.log('🎨 Generating PNG chart...');
        
        const success = await saveStandingsChart(standings, filename, {
            width: 1000,
            height: 700,
            title: `Norwegian Election Polling - Current Standings (${standings.date})`
        });

        if (success) {
            console.log(`✅ Chart successfully saved as: ${filename}`);
            console.log(`📋 Based on ${standings.pollCount} polls from ${standings.houses.length} polling houses`);
            console.log(`🏠 Houses: ${standings.houses.join(', ')}`);
        } else {
            console.log('⚠️  Could not generate PNG image');
            console.log('   This might be because Chart.js native dependencies are not compiled');
            console.log('   Try running: pnpm rebuild canvas');
            console.log('   Or install system dependencies for canvas (varies by OS)');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error generating chart:', error);
        process.exit(1);
    }
}

// Show usage if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('🇳🇴 Norwegian Election Polling - Chart Generator');
    console.log('Usage: npx tsx generate_chart.ts [lookback_days] [output_file]');
    console.log('');
    console.log('Generates house-effect-adjusted polling charts with:');
    console.log('• Vertical bars (going up from bottom)');
    console.log('• Party labels on bottom axis');  
    console.log('• Data values displayed on top of each bar');
    console.log('• Original party order (Ap, Høyre, Frp, SV, Sp, KrF, Venstre, MDG, Rødt, Andre)');
    console.log('• Norwegian party colors');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx generate_chart.ts                    # 14-day lookback, auto filename in charts/');
    console.log('  npx tsx generate_chart.ts 7                  # 7-day lookback, auto filename in charts/');
    console.log('  npx tsx generate_chart.ts 21 my_chart.png    # 21-day lookback, custom filename');
    console.log('');
    console.log('Arguments:');
    console.log('  lookback_days  Number of days to include (default: 14)');
    console.log('  output_file    PNG filename (default: charts/polling-YYYY-MM-DD-{days}day.png)');
    process.exit(0);
}

// Run the chart generator
generateChart().catch(console.error);