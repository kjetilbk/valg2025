#!/usr/bin/env npx tsx

import { readFileSync } from 'node:fs';
import { analyzeNorwegianPolls } from './src/index';
import { PARTY_NAMES } from './src/types';

function displayHouseEffects() {
    console.log('🇳🇴 Norwegian Election Polling - House Effects Analysis');
    console.log('====================================================\n');

    try {
        // Load and analyze data
        const csvContent = readFileSync('./polls.csv', 'utf8');
        const analysis = analyzeNorwegianPolls(csvContent, {
            includeAdjustments: false
        });

        if (!analysis.houseEffects) {
            console.log('❌ No house effects available');
            process.exit(1);
        }

        console.log('📊 House Effects (+ = overestimates, - = underestimates):\n');

        // Get all unique houses and sort them
        const houses = Object.keys(analysis.houseEffects).sort();
        
        // Simple list format for each house - show all parties
        for (const house of houses) {
            const effects = analysis.houseEffects[house]!;
            console.log(`${house}:`);
            
            const allEffects = [];
            for (const party of PARTY_NAMES) {
                const effect = effects[party];
                if (effect !== undefined) {
                    const sign = effect >= 0 ? '+' : '';
                    allEffects.push(`${party}: ${sign}${effect.toFixed(1)}`);
                } else {
                    allEffects.push(`${party}: —`);
                }
            }
            
            console.log(`  ${allEffects.join(', ')}`);
            console.log('');
        }

        console.log('\n📈 Summary:');
        console.log(`• Analyzed ${Object.keys(analysis.houseEffects).length} polling houses`);
        console.log('• Effects calculated using rolling ±14-day windows');
        console.log('• Values show systematic bias vs. time-adjusted benchmarks\n');

        // Find largest positive and negative biases
        let maxPositive = { house: '', party: '', effect: 0 };
        let maxNegative = { house: '', party: '', effect: 0 };

        for (const [house, effects] of Object.entries(analysis.houseEffects)) {
            for (const [party, effect] of Object.entries(effects)) {
                if (effect !== undefined && PARTY_NAMES.includes(party)) {
                    if (effect > maxPositive.effect) {
                        maxPositive = { house, party, effect };
                    }
                    if (effect < maxNegative.effect) {
                        maxNegative = { house, party, effect };
                    }
                }
            }
        }

        if (maxPositive.effect > 0) {
            console.log(`🔺 Largest overestimation: ${maxPositive.house} overestimates ${maxPositive.party} by +${maxPositive.effect.toFixed(2)} pts`);
        }
        
        if (maxNegative.effect < 0) {
            console.log(`🔻 Largest underestimation: ${maxNegative.house} underestimates ${maxNegative.party} by ${maxNegative.effect.toFixed(2)} pts`);
        }

    } catch (error) {
        console.error('❌ Error analyzing house effects:', error);
        process.exit(1);
    }
}

// Show usage if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('🇳🇴 Norwegian Election Polling - House Effects Analysis');
    console.log('Usage: npx tsx house_effects.ts');
    console.log('');
    console.log('Displays systematic biases detected in Norwegian polling houses:');
    console.log('• Rolling window calculations (±14 days)');
    console.log('• Positive values = house overestimates party');
    console.log('• Negative values = house underestimates party');
    console.log('• Shows largest biases for each house across all parties');
    process.exit(0);
}

// Run the analysis
displayHouseEffects();