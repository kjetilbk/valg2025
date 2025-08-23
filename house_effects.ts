#!/usr/bin/env npx tsx

import { readFileSync } from 'node:fs';
import { analyzeNorwegianPolls, PARTY_NAMES, type PartyName } from './src';

function displayHouseEffects() {
    console.log('🇳🇴 Norske Meningsmålinger - House Effects Analyse');
    console.log('===================================================\n');

    try {
        // Load and analyze data
        const csvContent = readFileSync('./polls.csv', 'utf8');
        const analysis = analyzeNorwegianPolls(csvContent, {
            includeAdjustments: false,
        });

        if (!analysis.houseEffects) {
            console.log('❌ Ingen house effects tilgjengelig');
            process.exit(1);
        }

        console.log('📊 House Effects (+ = overestimerer, - = underestimerer):\n');

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

        console.log('\n📈 Sammendrag:');
        console.log(`• Analyserte ${Object.keys(analysis.houseEffects).length} måleinstitutter`);
        console.log('• Effekter beregnet med rullende ±14-dagers vinduer');
        console.log('• Verdier viser systematisk skjevhet vs. tidsjusterte referansepunkter\n');

        // Find largest positive and negative biases
        let maxPositive = { house: '', party: '', effect: 0 };
        let maxNegative = { house: '', party: '', effect: 0 };

        for (const [house, effects] of Object.entries(analysis.houseEffects)) {
            for (const [party, effect] of Object.entries(effects)) {
                if (effect !== undefined && PARTY_NAMES.includes(party as PartyName)) {
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
            console.log(
                `🔺 Største overestimering: ${maxPositive.house} overestimerer ${maxPositive.party} med +${maxPositive.effect.toFixed(2)} poeng`
            );
        }

        if (maxNegative.effect < 0) {
            console.log(
                `🔻 Største underestimering: ${maxNegative.house} underestimerer ${maxNegative.party} med ${maxNegative.effect.toFixed(2)} poeng`
            );
        }
    } catch (error) {
        console.error('❌ Feil ved analyse av house effects:', error);
        process.exit(1);
    }
}

// Show usage if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('🇳🇴 Norske Meningsmålinger - House Effects Analyse');
    console.log('Bruk: npx tsx house_effects.ts');
    console.log('');
    console.log('Viser systematiske skjevheter oppdaget i norske måleinstitutter:');
    console.log('• Rullende vindusberegninger (±14 dager)');
    console.log('• Positive verdier = instituttet overestimerer partiet');
    console.log('• Negative verdier = instituttet underestimerer partiet');
    console.log('• Viser største skjevheter for hvert institutt på tvers av alle partier');
    process.exit(0);
}

// Run the analysis
displayHouseEffects();
