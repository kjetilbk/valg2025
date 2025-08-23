/**
 * Combined visualization module for Norwegian election analysis
 * 
 * Generates images that combine polling charts with bloc analysis visualization
 */

import { createCanvas } from '@napi-rs/canvas';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CurrentStandings, BlocAnalysis } from './types';

// Register Chart.js components
Chart.register(...registerables, ChartDataLabels);

// Norwegian party colors
const PARTY_COLORS = {
    'Ap': '#e30613',      // Red
    'Høyre': '#0065f1',   // Blue
    'Frp': '#006699',     // Dark blue
    'SV': '#bf2419',      // Dark red
    'Sp': '#00841b',      // Green
    'KrF': '#f4a127',     // Orange/Yellow
    'Venstre': '#009639', // Green
    'MDG': '#4d9d2a',     // Green
    'Rødt': '#a40000',    // Dark red
    'Andre': '#808080'    // Gray
} as const;

// Bloc colors
const BLOC_COLORS = {
    red: '#cc0000',    // Red for red-green bloc
    blue: '#0066cc'    // Blue for conservative bloc
} as const;

/**
 * Generate combined chart with polling data and bloc visualization
 */
export async function generateCombinedChart(
    standings: CurrentStandings,
    blocAnalysis: BlocAnalysis,
    outputPath: string
): Promise<void> {
    const width = 800;
    const pollingChartHeight = 500;
    const blocHeight = 100;
    const padding = 20;
    const totalHeight = pollingChartHeight + blocHeight + padding * 3;

    // Create canvas
    const canvas = createCanvas(width, totalHeight);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // Generate polling chart
    await generatePollingChart(ctx, standings, width, pollingChartHeight, padding);

    // Generate bloc visualization
    generateBlocVisualization(ctx, blocAnalysis, width, blocHeight, padding, pollingChartHeight + padding * 2);

    // Save the combined image
    const dir = dirname(outputPath);
    mkdirSync(dir, { recursive: true });
    
    const buffer = canvas.toBuffer('image/png');
    writeFileSync(outputPath, buffer);
}

/**
 * Generate the polling chart portion
 */
async function generatePollingChart(
    ctx: any,
    standings: CurrentStandings,
    width: number,
    height: number,
    padding: number
): Promise<void> {
    // Create a temporary canvas for the chart
    const chartCanvas = createCanvas(width - padding * 2, height - padding * 2);
    const chartCtx = chartCanvas.getContext('2d');

    // Prepare data for Chart.js
    const visibleParties = standings.standings.filter(party => party.percentage > 0);
    const labels = visibleParties.map(party => party.displayName);
    const data = visibleParties.map(party => party.percentage);
    const backgroundColors = visibleParties.map(party => PARTY_COLORS[party.party as keyof typeof PARTY_COLORS] || '#808080');

    const config: ChartConfiguration = {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color),
                borderWidth: 1
            }]
        },
        options: {
            responsive: false,
            animation: false,
            plugins: {
                title: {
                    display: true,
                    text: [
                        'Norske Meningsmålinger - Nåværende Stilling',
                        '==================================================',
                        `Per: ${standings.date} (${standings.lookbackDays} dagers tilbakeblikk)`,
                        `Basert på: ${standings.pollCount} målinger fra ${standings.houses.length} institutter`,
                        'House effects: JUSTERT'
                    ],
                    font: {
                        family: 'monospace',
                        size: 12
                    },
                    color: '#333333',
                    padding: 20
                },
                legend: {
                    display: false
                },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    formatter: (value: number) => `${value.toFixed(1)}%`,
                    color: '#000000',
                    font: {
                        weight: 'bold',
                        size: 10
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: Math.max(...data) * 1.2,
                    title: {
                        display: true,
                        text: 'Oppslutning (%)',
                        font: {
                            family: 'monospace'
                        }
                    },
                    ticks: {
                        font: {
                            family: 'monospace'
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Partier',
                        font: {
                            family: 'monospace'
                        }
                    },
                    ticks: {
                        font: {
                            family: 'monospace'
                        }
                    }
                }
            }
        }
    };

    // Create and render chart
    const chart = new Chart(chartCtx, config);

    // Copy chart to main canvas
    ctx.drawImage(chartCanvas, padding, padding);

    // Cleanup
    chart.destroy();
}

/**
 * Generate the bloc visualization rectangle
 */
function generateBlocVisualization(
    ctx: any,
    blocAnalysis: BlocAnalysis,
    width: number,
    height: number,
    padding: number,
    yOffset: number
): void {
    const rectWidth = width - padding * 2;
    const rectHeight = height - padding * 2;
    const x = padding;
    const y = yOffset + padding;

    const redBloc = blocAnalysis.blocs.red;
    const blueBloc = blocAnalysis.blocs.blue;
    const totalSeats = redBloc.seats + blueBloc.seats;

    // Calculate widths based on seat proportions
    const redWidth = (redBloc.seats / totalSeats) * rectWidth;
    const blueWidth = (blueBloc.seats / totalSeats) * rectWidth;

    // Draw red section
    ctx.fillStyle = BLOC_COLORS.red;
    ctx.fillRect(x, y, redWidth, rectHeight);

    // Draw blue section
    ctx.fillStyle = BLOC_COLORS.blue;
    ctx.fillRect(x + redWidth, y, blueWidth, rectHeight);

    // Add border around entire rectangle
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, rectWidth, rectHeight);

    // Add text labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Red bloc text
    if (redWidth > 60) { // Only show text if there's enough space
        const redCenterX = x + redWidth / 2;
        const centerY = y + rectHeight / 2;
        ctx.fillText(`${redBloc.seats}`, redCenterX, centerY);
    }

    // Blue bloc text
    if (blueWidth > 60) { // Only show text if there's enough space
        const blueCenterX = x + redWidth + blueWidth / 2;
        const centerY = y + rectHeight / 2;
        ctx.fillText(`${blueBloc.seats}`, blueCenterX, centerY);
    }

    // Add majority line (85 seats)
    const majorityPosition = (blocAnalysis.majority / totalSeats) * rectWidth;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x + majorityPosition, y);
    ctx.lineTo(x + majorityPosition, y + rectHeight);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Add labels below the rectangle
    ctx.fillStyle = '#000000';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    
    const labelY = y + rectHeight + 15;
    ctx.fillText(`Rød-grønn: ${redBloc.seats} mandater | Borgerlig: ${blueBloc.seats} mandater | Flertall: ${blocAnalysis.majority}`, x, labelY);
}