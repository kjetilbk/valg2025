#!/usr/bin/env npx tsx

import { analyzeNorwegianPolls, getCurrentStandings } from '../index';
import type { WeightingMethod } from '../pollingAverages';

interface TestResult {
    period: string;
    days: number;
    weighting: WeightingMethod;
    pollCount: number;
    ap: number;
    frp: number;
    hoyre: number;
    sv: number;
    volatility: number; // Sum of absolute differences from previous result
}

async function testWeightingComparison() {
    console.log('🔬 Testing Weighting vs No Weighting - Stability Analysis');
    console.log('========================================================\n');

    const analysis = analyzeNorwegianPolls({ includeAdjustments: true });
    
    if (!analysis.adjustedPolls) {
        console.log('❌ No adjusted polls available');
        return;
    }

    // Test periods - focusing on different polling densities
    const testPeriods = [
        { name: 'Recent (Aug 2025)', days: 7, description: 'High density period' },
        { name: 'Mid-Aug', days: 14, description: 'Mixed density' },
        { name: 'June-Aug', days: 60, description: 'Includes dead July' },
        { name: 'All data', days: 120, description: 'Full period' },
    ];

    const weightingMethods: WeightingMethod[] = ['none', 'exponential', 'linear'];
    const results: TestResult[] = [];

    for (const period of testPeriods) {
        console.log(`\n📅 ${period.name} (${period.days} days) - ${period.description}`);
        console.log('='.repeat(50));

        for (const weighting of weightingMethods) {
            const standings = getCurrentStandings(analysis.adjustedPolls, period.days, { 
                sortByPercentage: false,
                weighting,
                halfLife: 5 // Use 5-day half-life based on literature
            });

            if (standings) {
                const result: TestResult = {
                    period: period.name,
                    days: period.days,
                    weighting,
                    pollCount: standings.pollCount,
                    ap: standings.standings.find(s => s.party === 'Ap')?.percentage || 0,
                    frp: standings.standings.find(s => s.party === 'Frp')?.percentage || 0,
                    hoyre: standings.standings.find(s => s.party === 'Høyre')?.percentage || 0,
                    sv: standings.standings.find(s => s.party === 'SV')?.percentage || 0,
                    volatility: 0 // Will calculate after
                };
                results.push(result);

                console.log(`  ${weighting.padEnd(12)} | Polls: ${standings.pollCount.toString().padStart(2)} | Ap: ${result.ap.toFixed(1)}% | Frp: ${result.frp.toFixed(1)}% | Høyre: ${result.hoyre.toFixed(1)}% | SV: ${result.sv.toFixed(1)}%`);
            }
        }

        // Calculate differences between weighted and unweighted for this period
        const noneResult = results.find(r => r.period === period.name && r.weighting === 'none');
        const expResult = results.find(r => r.period === period.name && r.weighting === 'exponential');
        const linResult = results.find(r => r.period === period.name && r.weighting === 'linear');

        if (noneResult && expResult && linResult) {
            const expDiff = Math.abs(expResult.ap - noneResult.ap) + Math.abs(expResult.frp - noneResult.frp) + Math.abs(expResult.hoyre - noneResult.hoyre);
            const linDiff = Math.abs(linResult.ap - noneResult.ap) + Math.abs(linResult.frp - noneResult.frp) + Math.abs(linResult.hoyre - noneResult.hoyre);
            
            console.log(`  📊 Exponential vs None: ${expDiff.toFixed(2)}pp total difference`);
            console.log(`  📊 Linear vs None:      ${linDiff.toFixed(2)}pp total difference`);
        }
    }

    // Overall analysis
    console.log('\n🔍 ANALYSIS SUMMARY');
    console.log('===================');
    
    // Find periods where weighting made biggest difference
    const periodDiffs = testPeriods.map(period => {
        const none = results.find(r => r.period === period.name && r.weighting === 'none');
        const exp = results.find(r => r.period === period.name && r.weighting === 'exponential');
        
        if (none && exp) {
            const totalDiff = Math.abs(exp.ap - none.ap) + Math.abs(exp.frp - none.frp) + Math.abs(exp.hoyre - none.hoyre) + Math.abs(exp.sv - none.sv);
            return { period: period.name, diff: totalDiff, density: none.pollCount / period.days };
        }
        return null;
    }).filter(Boolean);

    console.log('\n📈 Impact of Exponential Weighting by Period:');
    periodDiffs.forEach(p => {
        console.log(`  ${p!.period.padEnd(15)} | ${p!.diff.toFixed(2)}pp difference | ${p!.density.toFixed(2)} polls/day`);
    });

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    const maxDiff = Math.max(...periodDiffs.map(p => p!.diff));
    const avgDiff = periodDiffs.reduce((sum, p) => sum + p!.diff, 0) / periodDiffs.length;
    
    if (avgDiff > 1.0) {
        console.log('✅ Weighting shows significant impact (>1pp average) - RECOMMEND using exponential weighting');
    } else if (avgDiff > 0.5) {
        console.log('⚖️  Weighting shows moderate impact - Consider exponential weighting for responsiveness');
    } else {
        console.log('❌ Weighting shows minimal impact (<0.5pp average) - Equal weighting may be sufficient');
    }
    
    console.log(`   Average impact: ${avgDiff.toFixed(2)}pp`);
    console.log(`   Maximum impact: ${maxDiff.toFixed(2)}pp`);
    
    // Check if July dead period affected things
    const julyIncluded = results.find(r => r.period === 'June-Aug');
    const recentOnly = results.find(r => r.period === 'Recent (Aug 2025)');
    if (julyIncluded && recentOnly) {
        console.log(`\n🗓️  July Impact: Including dead July period ${julyIncluded.pollCount} polls vs recent ${recentOnly.pollCount} polls`);
    }
}

testWeightingComparison().catch(console.error);