/**
 * Bloc trend visualization module
 * 
 * Creates time series charts showing red-green vs conservative seat projections over time
 */

import type { AdjustedPoll, CurrentStandings } from './types';
import { getCurrentStandings } from './visualization';
import { fetchSeatProjections, calculateBlocAnalysis } from './pollOfPollsApi';
import type { WeightingMethod } from './pollingAverages';
import { drawWatermark } from './watermark';

// Chart.js imports for image generation
let Canvas: typeof import('@napi-rs/canvas') | undefined;
let ChartJS: typeof import('chart.js') | undefined;

// Lazy load Chart.js dependencies
try {
    Canvas = require('@napi-rs/canvas');
    ChartJS = require('chart.js');
} catch {
    // Chart.js not available, image generation will be disabled
}

interface BlocTrendDataPoint {
    date: string;
    parsedDate: Date;
    redGreenSeats: number;
    conservativeSeats: number;
    othersSeats: number;
    redGreenVoteShare: number;
    conservativeVoteShare: number;
    othersVoteShare: number;
    pollCount: number;
    lookbackDays: number;
}

/**
 * Generate bloc trend data points for time series
 */
export async function generateBlocTrendData(
    adjustedPolls: AdjustedPoll[],
    options: {
        dayStep?: number;
        lookbackDays?: number;
        weighting?: WeightingMethod;
        timeframeDays?: number;
    } = {}
): Promise<BlocTrendDataPoint[]> {
    const { dayStep = 1, lookbackDays = 14, weighting = 'exponential', timeframeDays = 90 } = options;

    if (adjustedPolls.length === 0) return [];

    const sortedPolls = [...adjustedPolls].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    const latestDate = sortedPolls[sortedPolls.length - 1].parsedDate;
    const startDate = new Date(latestDate.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

    const dataPoints: BlocTrendDataPoint[] = [];

    // Generate data points for each day
    for (let dayOffset = 0; dayOffset <= timeframeDays; dayOffset += dayStep) {
        const currentDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        
        // Get polls up to this date (simulate historical perspective)
        const pollsUpToDate = sortedPolls.filter(poll => poll.parsedDate <= currentDate);
        
        if (pollsUpToDate.length === 0) continue;

        // Get standings for this point in time
        const standings = getCurrentStandings(pollsUpToDate, lookbackDays, {
            sortByPercentage: false,
            weighting
        });

        if (!standings || standings.pollCount < 3) continue; // Need minimum polls for reliable projection

        try {
            // Calculate vote share for blocs
            const redGreenParties = ['Rødt', 'SV', 'Ap', 'Sp', 'MDG'];
            const conservativeParties = ['Høyre', 'Frp', 'KrF', 'Venstre'];
            
            const redGreenVoteShare = redGreenParties.reduce((sum, party) => {
                const partyStanding = standings.standings.find(s => s.party === party);
                return sum + (partyStanding?.percentage || 0);
            }, 0);
            
            const conservativeVoteShare = conservativeParties.reduce((sum, party) => {
                const partyStanding = standings.standings.find(s => s.party === party);
                return sum + (partyStanding?.percentage || 0);
            }, 0);
            
            const othersVoteShare = standings.standings
                .filter(s => s.party === 'Andre')
                .reduce((sum, s) => sum + s.percentage, 0);

            // Get seat projection for this time point
            const seatProjection = await fetchSeatProjections(standings);
            const blocAnalysis = calculateBlocAnalysis(seatProjection);

            const dataPoint: BlocTrendDataPoint = {
                date: formatDate(currentDate),
                parsedDate: currentDate,
                redGreenSeats: blocAnalysis.blocs.red.seats,
                conservativeSeats: blocAnalysis.blocs.blue.seats,
                othersSeats: seatProjection.totalSeats - blocAnalysis.blocs.red.seats - blocAnalysis.blocs.blue.seats,
                redGreenVoteShare,
                conservativeVoteShare,
                othersVoteShare,
                pollCount: standings.pollCount,
                lookbackDays
            };

            dataPoints.push(dataPoint);

            // Rate limiting - small delay between API calls
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.warn(`Failed to get seat projection for ${formatDate(currentDate)}:`, error);
            continue;
        }
    }

    return dataPoints;
}

/**
 * Generate PNG image of bloc trend time series
 */
export async function generateBlocTrendChart(
    trendData: BlocTrendDataPoint[],
    options: {
        width?: number;
        height?: number;
        title?: string;
        tension?: number;
        mode?: 'seats' | 'votes';
    } = {}
): Promise<Buffer | null> {
    if (!Canvas || !ChartJS) {
        console.warn('Chart.js or @napi-rs/canvas not available - install for image generation');
        return null;
    }

    const { width = 1000, height = 600, tension = 0.4, mode = 'seats' } = options;

    if (trendData.length === 0) return null;

    try {
        // Create canvas
        const canvas = Canvas.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Register Chart.js components
        ChartJS.Chart.register(
            ChartJS.CategoryScale,
            ChartJS.LinearScale,
            ChartJS.LineElement,
            ChartJS.PointElement,
            ChartJS.LineController,
            ChartJS.Title,
            ChartJS.Tooltip,
            ChartJS.Legend,
            ChartJS.Filler
        );

        const isVoteMode = mode === 'votes';
        const chartTitle = options.title || (isVoteMode ? 'Utvikling av blokk-oppslutning over tid' : 'Utvikling av blokk-mandater over tid');
        const subtitle = `${trendData.length} datapunker | ${trendData[0].lookbackDays}-dagers rullende gjennomsnitt`;

        const configuration = {
            type: 'line' as const,
            data: {
                labels: trendData.map(d => d.date),
                datasets: [
                    {
                        label: 'Rød-grønn blokk',
                        data: isVoteMode ? trendData.map(d => d.redGreenVoteShare) : trendData.map(d => d.redGreenSeats),
                        borderColor: '#E61E2B',
                        backgroundColor: 'rgba(230, 30, 43, 0.1)',
                        fill: 'origin',
                        tension: tension,
                        borderWidth: 3,
                        pointRadius: 2,
                        pointHoverRadius: 6,
                    },
                    {
                        label: 'Borgerlig blokk',
                        data: isVoteMode ? trendData.map(d => d.conservativeVoteShare) : trendData.map(d => d.conservativeSeats),
                        borderColor: '#0057B7', 
                        backgroundColor: 'rgba(0, 87, 183, 0.1)',
                        fill: 'origin',
                        tension: tension,
                        borderWidth: 3,
                        pointRadius: 2,
                        pointHoverRadius: 6,
                    }
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
                        display: true,
                        position: 'top' as const,
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Dato',
                        },
                        grid: {
                            display: true,
                        },
                    },
                    y: {
                        beginAtZero: false,
                        min: isVoteMode ? 30 : 60, // Vote share: 30-70%, Seats: 60-110
                        max: isVoteMode ? 70 : 110,
                        title: {
                            display: true,
                            text: isVoteMode ? 'Oppslutning (%)' : 'Mandater',
                        },
                        grid: {
                            display: true,
                        },
                    },
                },
                elements: {
                    line: {
                        tension: tension // Cubic spline smoothing
                    }
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 30,
                        bottom: 10,
                    },
                },
            },
        };

        // Create Chart.js chart
        // @ts-ignore - Canvas context compatibility
        const chart = new ChartJS.Chart(ctx, configuration);

        // Add majority line (85 seats for seat mode, 50% for vote mode)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        const chartArea = chart.chartArea;
        const yScale = chart.scales.y;
        const majorityValue = isVoteMode ? 50 : 85;
        const majorityY = yScale.getPixelForValue(majorityValue);
        
        ctx.beginPath();
        ctx.moveTo(chartArea.left, majorityY);
        ctx.lineTo(chartArea.right, majorityY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Add majority label
        ctx.fillStyle = '#000000';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        const labelText = isVoteMode ? 'Flertall: 50%' : 'Flertall: 85 mandater';
        ctx.fillText(labelText, chartArea.right - 10, majorityY - 5);

        // Add watermark
        drawWatermark(ctx, width, height);

        // Convert to buffer
        const buffer = canvas.toBuffer('image/png');

        // Cleanup
        chart.destroy();

        return buffer;
    } catch (error) {
        console.error('Error generating bloc trend chart:', error);
        return null;
    }
}

/**
 * Save bloc trend chart to file
 */
export async function saveBlocTrendChart(
    trendData: BlocTrendDataPoint[],
    filename: string,
    options?: Parameters<typeof generateBlocTrendChart>[1]
): Promise<boolean> {
    const imageBuffer = await generateBlocTrendChart(trendData, options);

    if (!imageBuffer) return false;

    try {
        const fs = require('node:fs');
        fs.writeFileSync(filename, imageBuffer);
        return true;
    } catch (error) {
        console.error('Error saving bloc trend chart:', error);
        return false;
    }
}

// Helper function to format dates consistently
function formatDate(date: Date): string {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
}