import { calculateCurrentAverage } from './pollingAverages';
import type { AdjustedPoll } from './types';
import { PARTY_NAMES } from './types';

// Chart.js imports for image generation
let Canvas: any;
let ChartJS: any;
let ChartDataLabels: any;

// Lazy load Chart.js dependencies to avoid issues if not installed
try {
    Canvas = require('@napi-rs/canvas');
    ChartJS = require('chart.js');
    ChartDataLabels = require('chartjs-plugin-datalabels');
} catch (error) {
    // Chart.js not available, image generation will be disabled
}

export interface CurrentStandings {
    date: string;
    lookbackDays: number;
    pollCount: number;
    houses: string[];
    standings: Array<{
        party: string;
        percentage: number;
        displayName: string;
    }>;
}

/**
 * Get current house-adjusted standings based on lookback window
 */
export function getCurrentStandings(
    adjustedPolls: AdjustedPoll[],
    lookbackDays: number = 14,
    options: {
        sortByPercentage?: boolean;
    } = {}
): CurrentStandings | null {
    const { sortByPercentage = true } = options;

    const currentAverage = calculateCurrentAverage(adjustedPolls, lookbackDays);

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

    let chart = `Norwegian Election Polling - Current Standings\n`;
    chart += `${'='.repeat(50)}\n`;
    chart += `As of: ${date} (${lookbackDays} days lookback)\n`;
    chart += `Based on: ${pollCount} polls from ${houses.length} houses (${houses.join(', ')})\n`;
    chart += `House effects: ADJUSTED\n\n`;

    for (const party of parties) {
        const percentage = party.percentage;
        const barLength = Math.round((percentage / maxPercentage) * barWidth);
        const bar = '█'.repeat(barLength);
        const spaces = ' '.repeat(Math.max(0, 8 - party.displayName.length));

        chart += `${party.displayName}${spaces}${percentage.toFixed(1)}% ${bar}\n`;
    }

    chart += `\nTotal: ${parties.reduce((sum, p) => sum + p.percentage, 0).toFixed(1)}%\n`;

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

    return `Current (${lookbackDays}d, ${pollCount} polls): ${summary}`;
}

/**
 * Get comparison between raw and adjusted standings
 */
export function getAdjustmentComparison(
    rawPolls: any[],
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
    Ap: '#E61E2B', // Red - Arbeiderpartiet
    Høyre: '#0057B7', // Blue - Conservative
    Frp: '#003580', // Dark Blue - Progress Party
    SV: '#FF6B35', // Orange - Socialist Left
    Sp: '#00A64F', // Green - Centre Party
    KrF: '#FFD700', // Yellow - Christian Democrats
    Venstre: '#90EE90', // Light Green - Liberal Party
    MDG: '#228B22', // Forest Green - Green Party
    Rødt: '#8B0000', // Dark Red - Red Party
    Andre: '#808080', // Gray - Others
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

    const { width = 800, height = 600, backgroundColor = '#ffffff', title } = options;

    const { standings: parties, lookbackDays, pollCount, houses, date } = standings;

    if (parties.length === 0) return null;

    try {
        // Create canvas
        const canvas = Canvas.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Register Chart.js components and configure canvas
        ChartJS.Chart.register(
            ChartJS.CategoryScale,
            ChartJS.LinearScale,
            ChartJS.BarElement,
            ChartJS.BarController,
            ChartJS.Title,
            ChartJS.Tooltip,
            ChartJS.Legend,
            ChartDataLabels
        );

        const chartTitle = title || `Norwegian Election Polling - Current Standings (${date})`;
        const subtitle = `${lookbackDays}-day lookback • ${pollCount} polls from ${houses.length} houses • House effects adjusted`;

        const configuration = {
            type: 'bar',
            data: {
                labels: parties.map((p) => p.displayName),
                datasets: [
                    {
                        label: 'Support (%)',
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
                            text: 'Parties',
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
                            text: 'Support (%)',
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
        const chart = new ChartJS.Chart(ctx, configuration);

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
        const fs = require('fs');
        fs.writeFileSync(filename, imageBuffer);
        return true;
    } catch (error) {
        console.error('Error saving chart image:', error);
        return false;
    }
}
