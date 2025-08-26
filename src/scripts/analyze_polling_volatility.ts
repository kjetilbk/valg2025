#!/usr/bin/env npx tsx

import { analyzeNorwegianPolls } from '../index';
import { PARTY_NAMES } from '../types';

async function analyzeVolatility() {
    console.log('🔍 Analyzing Polling Volatility for Optimal Weighting');
    console.log('====================================================\n');

    const analysis = analyzeNorwegianPolls({ includeAdjustments: true });
    
    if (!analysis.adjustedPolls) {
        console.log('❌ No adjusted polls available');
        return;
    }

    const polls = analysis.adjustedPolls.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    
    console.log(`📊 Analyzing ${polls.length} polls from ${polls[0].date} to ${polls[polls.length - 1].date}\n`);

    // Calculate day-to-day volatility for each party
    for (const party of ['Ap', 'Frp', 'Høyre', 'SV'] as const) {
        console.log(`\n${party} Volatility Analysis:`);
        console.log('========================');
        
        let totalVariance = 0;
        let dayCount = 0;
        
        for (let i = 1; i < polls.length; i++) {
            const prevPoll = polls[i-1];
            const currPoll = polls[i];
            
            const daysDiff = (currPoll.parsedDate.getTime() - prevPoll.parsedDate.getTime()) / (1000 * 60 * 60 * 24);
            const partyDiff = Math.abs((currPoll.parties[party] || 0) - (prevPoll.parties[party] || 0));
            
            // Normalize by square root of days (volatility typically scales with sqrt(time))
            const normalizedDiff = partyDiff / Math.sqrt(daysDiff);
            
            totalVariance += normalizedDiff * normalizedDiff;
            dayCount++;
            
            if (partyDiff > 2.0) { // Flag large movements
                console.log(`  📈 ${prevPoll.date} → ${currPoll.date}: ${partyDiff.toFixed(1)}pp change (${daysDiff.toFixed(0)} days)`);
            }
        }
        
        const avgVolatility = Math.sqrt(totalVariance / dayCount);
        console.log(`  📊 Average daily volatility: ${avgVolatility.toFixed(2)}pp/day`);
        
        // Estimate optimal half-life based on when signal-to-noise ratio becomes poor
        const optimalHalfLife = Math.max(3, Math.min(14, 2.0 / avgVolatility));
        console.log(`  ⏰ Suggested half-life: ${optimalHalfLife.toFixed(1)} days`);
    }

    // Analyze house effects as indicator of systematic vs random variation
    console.log(`\n🏠 House Effect Analysis:`);
    console.log('========================');
    
    if (analysis.houseEffects) {
        for (const [house, effects] of Object.entries(analysis.houseEffects)) {
            const maxBias = Math.max(...Object.values(effects).map(Math.abs));
            console.log(`  ${house}: Max bias ${maxBias.toFixed(1)}pp`);
        }
        
        const allBiases = Object.values(analysis.houseEffects)
            .flatMap(effects => Object.values(effects).map(Math.abs));
        const avgBias = allBiases.reduce((a, b) => a + b, 0) / allBiases.length;
        
        console.log(`\n  📊 Average house bias: ${avgBias.toFixed(2)}pp`);
        console.log(`  💡 If volatility < house bias, longer weighting windows are better`);
        console.log(`     If volatility > house bias, shorter weighting windows capture real trends`);
    }
}

analyzeVolatility().catch(console.error);