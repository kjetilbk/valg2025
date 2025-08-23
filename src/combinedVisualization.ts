/**
 * Combined visualization module for Norwegian election analysis
 *
 * Manages canvas and coordinates drawing from specialized modules
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { drawPartySeats } from './partyVisualization';
import type { BlocAnalysis, CurrentStandings, SeatProjection } from './types';
import { drawStandingsChart } from './visualization';
import { drawWatermark } from './watermark';

/**
 * Generate combined chart with polling data and party seat visualization
 *
 * This function manages the canvas and coordinates drawing from specialized modules
 */
export async function generateCombinedChart(
    standings: CurrentStandings,
    _blocAnalysis: BlocAnalysis,
    outputPath: string,
    seatProjection?: SeatProjection
): Promise<void> {
    const width = 800;
    const pollingChartHeight = 500;
    const blocHeight = 100;
    const spacing = 10;
    const totalHeight = pollingChartHeight + blocHeight + spacing;

    // Create main canvas and context
    const canvas = createCanvas(width, totalHeight);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // Draw the polling chart in the top section
    await drawStandingsChart(ctx, standings, width, pollingChartHeight, {
        x: 0,
        y: 0,
    });

    // Draw the party seat visualization in the bottom section
    if (seatProjection) {
        drawPartySeats(ctx, seatProjection, width, blocHeight, 0, pollingChartHeight + spacing);
    }

    // Add watermark aligned with the "Mandatfordeling" label
    if (seatProjection) {
        // Calculate the same Y position as the "Mandatfordeling" text
        // y = pollingChartHeight + spacing, rectHeight = blocHeight - 20
        const partySectionY = pollingChartHeight + spacing;
        const rectHeight = blocHeight - 20;
        const labelY = partySectionY + rectHeight + 15; // Same calculation as partyVisualization.ts
        drawWatermark(ctx, width, totalHeight, labelY);
    } else {
        // If no seat projection, use bottom corner
        drawWatermark(ctx, width, totalHeight);
    }

    // Save the combined image
    const dir = dirname(outputPath);
    mkdirSync(dir, { recursive: true });

    const buffer = canvas.toBuffer('image/png');
    writeFileSync(outputPath, buffer);
}
