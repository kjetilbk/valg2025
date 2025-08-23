/**
 * Seat projection visualization functions
 */

import type { BlocAnalysis, SeatProjection } from './types';

/**
 * Generate ASCII bar chart for seat projections
 */
export function generateSeatProjectionChart(seatProjection: SeatProjection): string {
    const { projections, lookbackDays, pollCount, houses, date, totalSeats, threshold } =
        seatProjection;

    if (projections.length === 0) return 'Ingen data tilgjengelig';

    const maxSeats = Math.max(...projections.map((p) => p.seats));
    const barWidth = 50; // Maximum bar width in characters

    let chart = `Norske Stortingsvalg - Mandatprognose\n`;
    chart += `${'='.repeat(40)}\n`;
    chart += `Per: ${date} (${lookbackDays} dagers tilbakeblikk)\n`;
    chart += `Basert på: ${pollCount} målinger fra ${houses.length} institutter\n`;
    chart += `Sperregrense: ${threshold}% • Totalt: ${totalSeats} mandater\n\n`;

    for (const projection of projections) {
        const seats = projection.seats;
        const percentage = projection.percentage;
        const barLength = maxSeats > 0 ? Math.round((seats / maxSeats) * barWidth) : 0;
        const bar = '█'.repeat(barLength);
        const spaces = ' '.repeat(Math.max(0, 8 - projection.displayName.length));
        const thresholdIcon = projection.aboveThreshold ? '✓' : '✗';

        chart += `${projection.displayName}${spaces}${seats} mandater (${percentage.toFixed(1)}%) ${thresholdIcon} ${bar}\n`;
    }

    const totalProjectedSeats = projections.reduce((sum, p) => sum + p.seats, 0);
    chart += `\nTotalt: ${totalProjectedSeats} mandater\n`;
    chart += `Flertall: ${Math.floor(totalSeats / 2) + 1} mandater\n`;

    return chart;
}

/**
 * Generate ASCII visualization for bloc analysis
 */
export function generateBlocChart(blocAnalysis: BlocAnalysis): string {
    const { blocs, lookbackDays, pollCount, houses, date, totalSeats, majority } = blocAnalysis;

    let chart = `Norske Stortingsvalg - Blokk-analyse\n`;
    chart += `${'='.repeat(38)}\n`;
    chart += `Per: ${date} (${lookbackDays} dagers tilbakeblikk)\n`;
    chart += `Basert på: ${pollCount} målinger fra ${houses.length} institutter\n`;
    chart += `Flertall: ${majority} av ${totalSeats} mandater\n\n`;

    // Create horizontal bars for each bloc
    const redSeats = blocs.red.seats;
    const blueSeats = blocs.blue.seats;
    const otherSeats = blocs.other.seats;

    // Calculate proportional bar lengths (total width = 60 chars)
    const totalWidth = 60;
    const redWidth = Math.round((redSeats / totalSeats) * totalWidth);
    const blueWidth = Math.round((blueSeats / totalSeats) * totalWidth);
    const otherWidth = Math.max(0, totalWidth - redWidth - blueWidth);

    // Generate bars
    const redBar = '█'.repeat(redWidth);
    const blueBar = '█'.repeat(blueWidth);
    const otherBar = '█'.repeat(otherWidth);

    chart += `Rød-grønn blokk:     ${redSeats} mandater (${blocs.red.percentage.toFixed(1)}%) ${blocs.red.hasMajority ? '👑 FLERTALL' : ''}\n`;
    chart += `Borgerlig blokk:     ${blueSeats} mandater (${blocs.blue.percentage.toFixed(1)}%) ${blocs.blue.hasMajority ? '👑 FLERTALL' : ''}\n`;
    chart += `Andre:               ${otherSeats} mandater (${blocs.other.percentage.toFixed(1)}%)\n\n`;

    chart += `Mandatfordeling:\n`;
    chart += `┌${'─'.repeat(totalWidth)}┐\n`;
    chart += `│\\x1b[31m${redBar}\\x1b[34m${blueBar}\\x1b[37m${otherBar}\\x1b[0m│\n`;
    chart += `└${'─'.repeat(totalWidth)}┘\n`;
    chart += `Rød-grønn: ${redSeats} | Borgerlig: ${blueSeats} | Andre: ${otherSeats}\n\n`;

    // List parties in each bloc
    chart += `Rød-grønn blokk: ${blocs.red.parties.join(', ')}\n`;
    chart += `Borgerlig blokk: ${blocs.blue.parties.join(', ')}\n`;
    if (otherSeats > 0) {
        chart += `Andre: ${blocs.other.parties.join(', ')}\n`;
    }

    return chart;
}

/**
 * Generate compact seat summary
 */
export function generateSeatSummary(seatProjection: SeatProjection): string {
    const { projections, lookbackDays, pollCount } = seatProjection;

    const topParties = projections
        .filter((p) => p.seats > 0)
        .slice(0, 5)
        .map((p) => `${p.displayName} ${p.seats}`)
        .join(', ');

    return `Mandater (${lookbackDays}d, ${pollCount} målinger): ${topParties}`;
}

/**
 * Generate compact bloc summary
 */
export function generateBlocSummary(blocAnalysis: BlocAnalysis): string {
    const { blocs, lookbackDays, pollCount } = blocAnalysis;

    const winner = blocs.red.hasMajority
        ? 'Rød-grønn'
        : blocs.blue.hasMajority
          ? 'Borgerlig'
          : 'Ingen flertall';

    return `Blokk (${lookbackDays}d, ${pollCount} målinger): Rød ${blocs.red.seats} | Borgerlig ${blocs.blue.seats} | ${winner} ${winner !== 'Ingen flertall' ? '👑' : ''}`;
}
