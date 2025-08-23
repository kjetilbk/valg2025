import { calculateCurrentAverage, type WeightingMethod } from './pollingAverages';
import type { AdjustedPoll, CurrentStandings } from './types';
import { PARTY_NAMES } from './types';
import { drawWatermark } from './watermark';

// Chart.js imports for image generation
let Canvas: typeof import('@napi-rs/canvas') | undefined;
let ChartJS: typeof import('chart.js') | undefined;
let ChartDataLabels: typeof import('chartjs-plugin-datalabels') | undefined;

// Lazy load Chart.js dependencies to avoid issues if not installed
try {
    Canvas = require('@napi-rs/canvas');
    ChartJS = require('chart.js');
    ChartDataLabels = require('chartjs-plugin-datalabels');
} catch {
    // Chart.js not available, image generation will be disabled
}

/**
 * Get current house-adjusted standings based on lookback window
 */
export function getCurrentStandings(
    adjustedPolls: AdjustedPoll[],
    lookbackDays: number = 14,
    options: {
        sortByPercentage?: boolean;
        weighting?: WeightingMethod;
        halfLife?: number;
    } = {}
): CurrentStandings | null {
    const { sortByPercentage = true, weighting = 'none', halfLife = 7 } = options;

    const currentAverage = calculateCurrentAverage(adjustedPolls, lookbackDays, weighting, halfLife);

    if (!currentAverage) return null;

    let standings = PARTY_NAMES.map((party) => ({
        party,
        percentage: currentAverage.parties[party] || 0,
        displayName: party,
    })).filter((s) => s.percentage > 0);

    if (sortByPercentage) {
        standings = standings.sort((a, b) => b.percentage - a.percentage);
    }

    return {
        date: currentAverage.date,
        lookbackDays,
        pollCount: currentAverage.pollCount,
        houses: currentAverage.houses.sort(),
        standings,
    };
}

/**
 * Generate ASCII bar chart for current standings
 */
export function generateStandingsBarChart(standings: CurrentStandings): string {
    const { standings: parties, lookbackDays, pollCount, houses, date } = standings;

    if (parties.length === 0) return 'No data available';

    const maxPercentage = Math.max(...parties.map((p) => p.percentage));
    const barWidth = 50; // Maximum bar width in characters

    let chart = `Gjennomsnitt av meningsmålinger, house effect-justert\n`;
    chart += `Per: ${date} (${lookbackDays} dagers tilbakeblikk)\n`;
    chart += `Basert på: ${pollCount} målinger fra ${houses.length} institutter (${houses.join(', ')})\n`;

    for (const party of parties) {
        const percentage = party.percentage;
        const barLength = Math.round((percentage / maxPercentage) * barWidth);
        const bar = '█'.repeat(barLength);
        const spaces = ' '.repeat(Math.max(0, 8 - party.displayName.length));

        chart += `${party.displayName}${spaces}${percentage.toFixed(1)}% ${bar}\n`;
    }

    chart += `\nTotalt: ${parties.reduce((sum, p) => sum + p.percentage, 0).toFixed(1)}%\n`;

    return chart;
}

/**
 * Generate compact standings summary (one-line per party)
 */
export function generateStandingsSummary(standings: CurrentStandings): string {
    const { standings: parties, pollCount, lookbackDays } = standings;

    const summary = parties
        .slice(0, 5) // Top 5 parties
        .map((p) => `${p.displayName} ${p.percentage.toFixed(1)}%`)
        .join(', ');

    return `Nåværende (${lookbackDays}d, ${pollCount} målinger): ${summary}`;
}

/**
 * Get comparison between raw and adjusted standings
 */
export function getAdjustmentComparison(
    rawPolls: AdjustedPoll[],
    adjustedPolls: AdjustedPoll[],
    lookbackDays: number = 14
): {
    raw: CurrentStandings | null;
    adjusted: CurrentStandings | null;
    differences: Array<{ party: string; rawPct: number; adjustedPct: number; difference: number }>;
} {
    // Convert raw polls to adjusted format for comparison
    const pseudoAdjustedRaw = rawPolls.map((poll) => ({
        ...poll,
        originalParties: { ...poll.parties },
        adjustments: {},
    }));

    const rawStandings = getCurrentStandings(pseudoAdjustedRaw, lookbackDays);
    const adjustedStandings = getCurrentStandings(adjustedPolls, lookbackDays);

    const differences: Array<{
        party: string;
        rawPct: number;
        adjustedPct: number;
        difference: number;
    }> = [];

    if (rawStandings && adjustedStandings) {
        for (const party of PARTY_NAMES) {
            const rawPct = rawStandings.standings.find((s) => s.party === party)?.percentage || 0;
            const adjPct =
                adjustedStandings.standings.find((s) => s.party === party)?.percentage || 0;

            if (rawPct > 0 || adjPct > 0) {
                differences.push({
                    party,
                    rawPct,
                    adjustedPct: adjPct,
                    difference: adjPct - rawPct,
                });
            }
        }
    }

    return {
        raw: rawStandings,
        adjusted: adjustedStandings,
        differences: differences.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)),
    };
}

/**
 * Norwegian party colors for consistent visualization
 */
const PARTY_COLORS: Record<string, string> = {
    Ap: '#e30613', // Red
    Høyre: '#0065f1', // Blue
    Frp: '#006699', // Dark blue
    SV: '#bf2419', // Dark red
    Sp: '#00841b', // Green
    KrF: '#f4a127', // Orange/Yellow
    Venstre: '#009639', // Green
    MDG: '#4d9d2a', // Green
    Rødt: '#a40000', // Dark red
    Andre: '#808080', // Gray
};

/**
 * Generate PNG image of current standings bar chart
 */
export async function generateStandingsImage(
    standings: CurrentStandings,
    options: {
        width?: number;
        height?: number;
        backgroundColor?: string;
        title?: string;
    } = {}
): Promise<Buffer | null> {
    if (!Canvas || !ChartJS) {
        console.warn(
            'Chart.js or @napi-rs/canvas not available - install chart.js and @napi-rs/canvas for image generation'
        );
        return null;
    }

    const { width = 800, height = 600, title } = options;

    const { standings: parties, lookbackDays, pollCount, houses, date } = standings;

    if (parties.length === 0) return null;

    try {
        // Create canvas
        const canvas = Canvas.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Register Chart.js components and configure canvas
        const components = [
            ChartJS.CategoryScale,
            ChartJS.LinearScale,
            ChartJS.BarElement,
            ChartJS.BarController,
            ChartJS.Title,
            ChartJS.Tooltip,
            ChartJS.Legend,
        ];

        if (ChartDataLabels) {
            // biome-ignore lint/suspicious/noExplicitAny: ChartDataLabels plugin has complex typing incompatibility
            components.push(ChartDataLabels as any);
        }

        ChartJS.Chart.register(...components);

        const chartTitle = title || `Gjennomsnitt av meningsmålinger, house effect-justert`;
        const subtitle = `Per: ${date} (${lookbackDays} dagers tilbakeblikk)\nBasert på: ${pollCount} målinger fra ${houses.length} institutter (${houses.join(', ')})`;

        const configuration = {
            type: 'bar' as const,
            data: {
                labels: parties.map((p) => p.displayName),
                datasets: [
                    {
                        label: 'Oppslutning (%)',
                        data: parties.map((p) => p.percentage),
                        backgroundColor: parties.map((p) => PARTY_COLORS[p.party] || '#808080'),
                        borderColor: parties.map((p) => PARTY_COLORS[p.party] || '#808080'),
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: false,
                animation: false,
                plugins: {
                    title: {
                        display: true,
                        text: [chartTitle, subtitle],
                        font: {
                            size: 16,
                        },
                        padding: {
                            top: 10,
                            bottom: 30,
                        },
                    },
                    legend: {
                        display: false,
                    },
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'top',
                        color: 'black',
                        font: {
                            weight: 'bold',
                            size: 12,
                        },
                        formatter: (value: number) => `${value.toFixed(1)}%`,
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Partier',
                        },
                    },
                    y: {
                        beginAtZero: true,
                        max: Math.max(
                            Math.ceil(Math.max(...parties.map((p) => p.percentage)) / 5) * 5,
                            30
                        ),
                        title: {
                            display: true,
                            text: 'Oppslutning (%)',
                        },
                        grid: {
                            display: true,
                        },
                    },
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 30, // Extra padding for data labels
                        bottom: 10,
                    },
                },
            },
        };

        // Create Chart.js chart with the canvas
        // biome-ignore lint/suspicious/noExplicitAny: @napi-rs/canvas context has different type than browser CanvasRenderingContext2D
        const chart = new ChartJS.Chart(ctx as any, configuration as any);

        // Add watermark to standalone chart
        drawWatermark(ctx, width, height);

        // Convert to buffer
        const buffer = canvas.toBuffer('image/png');

        // Destroy chart to free memory
        chart.destroy();

        return buffer;
    } catch (error) {
        console.error('Error generating chart image:', error);
        return null;
    }
}

/**
 * Draw standings chart to an existing canvas context
 * This allows for composition with other visualizations
 */
export async function drawStandingsChart(
    // biome-ignore lint/suspicious/noExplicitAny: Canvas context from @napi-rs/canvas has different type than browser CanvasRenderingContext2D
    ctx: any,
    standings: CurrentStandings,
    width: number,
    height: number,
    options: {
        title?: string;
        x?: number;
        y?: number;
    } = {}
): Promise<void> {
    if (!Canvas || !ChartJS) {
        throw new Error('Chart.js or @napi-rs/canvas not available');
    }

    const { title, x = 0, y = 0 } = options;
    const { standings: parties, lookbackDays, pollCount, houses, date } = standings;

    if (parties.length === 0) return;

    // Create temporary canvas for chart generation
    const chartCanvas = Canvas.createCanvas(width, height);
    const chartCtx = chartCanvas.getContext('2d');

    // Register Chart.js components
    const components = [
        ChartJS.CategoryScale,
        ChartJS.LinearScale,
        ChartJS.BarElement,
        ChartJS.BarController,
        ChartJS.Title,
        ChartJS.Tooltip,
        ChartJS.Legend,
    ];

    if (ChartDataLabels) {
        // biome-ignore lint/suspicious/noExplicitAny: ChartDataLabels plugin has complex typing incompatibility
        components.push(ChartDataLabels as any);
    }

    ChartJS.Chart.register(...components);

    const chartTitle = title || `Gjennomsnitt av meningsmålinger, house effect-justert`;
    const subtitle = `Per: ${date} (${lookbackDays} dagers tilbakeblikk)\nBasert på: ${pollCount} målinger fra ${houses.length} institutter (${houses.join(', ')})`;

    const configuration = {
        type: 'bar' as const,
        data: {
            labels: parties.map((p) => p.displayName),
            datasets: [
                {
                    label: 'Oppslutning (%)',
                    data: parties.map((p) => p.percentage),
                    backgroundColor: parties.map((p) => PARTY_COLORS[p.party] || '#808080'),
                    borderColor: parties.map((p) => PARTY_COLORS[p.party] || '#808080'),
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: false,
            animation: false,
            plugins: {
                title: {
                    display: true,
                    text: [chartTitle, subtitle],
                    font: {
                        size: 16,
                    },
                    padding: {
                        top: 10,
                        bottom: 30,
                    },
                },
                legend: {
                    display: false,
                },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    color: 'black',
                    font: {
                        weight: 'bold',
                        size: 12,
                    },
                    formatter: (value: number) => `${value.toFixed(1)}%`,
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Partier',
                    },
                },
                y: {
                    beginAtZero: true,
                    max: Math.max(
                        Math.ceil(Math.max(...parties.map((p) => p.percentage)) / 5) * 5,
                        30
                    ),
                    title: {
                        display: true,
                        text: 'Oppslutning (%)',
                    },
                },
            },
        },
    };

    // Create and render chart
    // biome-ignore lint/suspicious/noExplicitAny: @napi-rs/canvas context has different type than browser CanvasRenderingContext2D
    const chart = new ChartJS.Chart(chartCtx as any, configuration as any);

    // Draw the chart canvas onto the main context
    ctx.drawImage(chartCanvas, x, y);

    // Cleanup
    chart.destroy();
}

/**
 * Save standings chart as PNG file
 */
export async function saveStandingsChart(
    standings: CurrentStandings,
    filename: string,
    options?: Parameters<typeof generateStandingsImage>[1]
): Promise<boolean> {
    const imageBuffer = await generateStandingsImage(standings, options);

    if (!imageBuffer) return false;

    try {
        const fs = require('node:fs');
        fs.writeFileSync(filename, imageBuffer);
        return true;
    } catch (error) {
        console.error('Error saving chart image:', error);
        return false;
    }
}
