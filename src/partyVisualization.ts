/**
 * Party seat visualization module
 *
 * Draws party seat rectangles on existing canvas contexts
 */

import type { SeatProjection } from './types';

// Norwegian party colors
const PARTY_COLORS = {
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
} as const;

// Short forms for narrow sections
const PARTY_SHORT_NAMES = {
    Ap: 'Ap',
    Høyre: 'H',
    Frp: 'Frp',
    SV: 'SV',
    Sp: 'Sp',
    KrF: 'KrF',
    Venstre: 'V',
    MDG: 'MDG',
    Rødt: 'R',
    Andre: 'A',
} as const;

/**
 * Draw party seat visualization rectangle on existing canvas context
 */
export function drawPartySeats(
    // biome-ignore lint/suspicious/noExplicitAny: Canvas context from @napi-rs/canvas has different type than browser CanvasRenderingContext2D
    ctx: any,
    seatProjection: SeatProjection,
    width: number,
    height: number,
    x: number,
    y: number
): void {
    const rectWidth = width;
    const rectHeight = height - 20; // Leave space for label

    // Party order: Rødt, SV, Ap, Sp, MDG, Andre, KrF, Venstre, Høyre, Frp
    const partyOrder = ['Rødt', 'SV', 'Ap', 'Sp', 'MDG', 'Andre', 'KrF', 'Venstre', 'Høyre', 'Frp'];

    // Get party data with seats > 0
    const partyData = partyOrder
        .map((party) => {
            const projection = seatProjection.projections.find((p) => p.party === party);
            return {
                party,
                seats: projection ? projection.seats : 0,
            };
        })
        .filter((p) => p.seats > 0);

    const totalSeats = seatProjection.totalSeats;
    let currentX = x;

    // Draw each party section
    partyData.forEach((party) => {
        const sectionWidth = (party.seats / totalSeats) * rectWidth;

        // Get party color
        const partyColor = PARTY_COLORS[party.party as keyof typeof PARTY_COLORS] || '#808080';

        // Draw party section
        ctx.fillStyle = partyColor;
        ctx.fillRect(currentX, y, sectionWidth, rectHeight);

        // Add party text (use short form if section is narrow)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const centerX = currentX + sectionWidth / 2;
        const upperY = y + rectHeight * 0.3;
        const lowerY = y + rectHeight * 0.7;

        // Use short name if section is narrow (less than 40 pixels)
        const displayName =
            sectionWidth < 40
                ? PARTY_SHORT_NAMES[party.party as keyof typeof PARTY_SHORT_NAMES] || party.party
                : party.party;

        // Party name on top
        ctx.fillText(displayName, centerX, upperY);
        // Seat count below
        ctx.fillText(`${party.seats}`, centerX, lowerY);

        currentX += sectionWidth;
    });

    // Add border around entire rectangle
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, rectWidth, rectHeight);

    // Add majority line (85 seats)
    const majority = Math.floor(totalSeats / 2) + 1;
    const majorityPosition = (majority / totalSeats) * rectWidth;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x + majorityPosition, y);
    ctx.lineTo(x + majorityPosition, y + rectHeight);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Calculate bloc seats
    const redGreenParties = ['Rødt', 'SV', 'Ap', 'Sp', 'MDG'];
    const conservativeParties = ['Høyre', 'Frp', 'KrF', 'Venstre'];
    
    const redGreenSeats = partyData
        .filter(p => redGreenParties.includes(p.party))
        .reduce((sum, p) => sum + p.seats, 0);
    
    const conservativeSeats = partyData
        .filter(p => conservativeParties.includes(p.party))
        .reduce((sum, p) => sum + p.seats, 0);
        
    const othersSeats = partyData
        .filter(p => p.party === 'Andre')
        .reduce((sum, p) => sum + p.seats, 0);

    // Add label below the rectangle
    ctx.fillStyle = '#000000';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';

    const labelY = y + rectHeight + 15;
    const comparison = redGreenSeats > conservativeSeats ? '>' : '<';
    const labelText = othersSeats > 0 
        ? `Rød-grønn: ${redGreenSeats} ${comparison} Borgerlig: ${conservativeSeats} | Andre: ${othersSeats}`
        : `Rød-grønn: ${redGreenSeats} ${comparison} Borgerlig: ${conservativeSeats}`;
    ctx.fillText(labelText, x, labelY);
}
