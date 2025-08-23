/**
 * Poll of Polls API integration for Norwegian seat calculations
 * 
 * Uses www.pollofpolls.no to calculate seat distribution instead of our own implementation.
 * This ensures we use the same calculations as the authoritative Norwegian polling site.
 */

import type { CurrentStandings, SeatProjection, BlocAnalysis } from './types';

/**
 * Poll of Polls base URL for seat calculations
 */
const POLL_OF_POLLS_BASE_URL = 'https://www.pollofpolls.no/';

/**
 * Map our party names to Poll of Polls parameter names
 */
const PARTY_PARAM_MAP = {
    'Ap': 'Ap',
    'Høyre': 'H', 
    'Frp': 'Frp',
    'SV': 'SV',
    'Sp': 'Sp',
    'KrF': 'KrF',
    'Venstre': 'V',
    'MDG': 'MDG',
    'Rødt': 'R',
    'Andre': 'A'
} as const;

/**
 * Build Poll of Polls URL with current polling percentages
 */
function buildPollOfPollsUrl(standings: CurrentStandings): string {
    const baseParams = {
        cmd: 'Mandatfordeling',
        do: 'stalf',
        nbr: 'forh',
        fylkeid: '0',
        kommuneid: '1201',
        L1: '',
        L2: '',
        L3: '',
        mode: 'pst',
        name: 'Beregn',
        INP: '0'
    };
    
    const url = new URL(POLL_OF_POLLS_BASE_URL);
    
    // Add base parameters
    Object.entries(baseParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    
    // Add party percentages
    standings.standings.forEach(party => {
        const paramName = PARTY_PARAM_MAP[party.party as keyof typeof PARTY_PARAM_MAP];
        if (paramName) {
            url.searchParams.set(paramName, party.percentage.toFixed(1));
        }
    });
    
    return url.toString();
}

/**
 * Parse the HTML table returned by Poll of Polls to extract seat allocations
 */
function parseSeatAllocationTable(html: string): Record<string, number> {
    const seats: Record<string, number> = {};
    
    // Try multiple patterns for image URL (handle both & and &amp;)
    const imageUrlPatterns = [
        /image-dev\.php\?[^"]*?&(?:amp;)?Ap=(\d+)&(?:amp;)?H=(\d+)&(?:amp;)?Frp=(\d+)&(?:amp;)?SV=(\d+)&(?:amp;)?Sp=(\d+)&(?:amp;)?KrF=(\d+)&(?:amp;)?V=(\d+)&(?:amp;)?MDG=(\d+)&(?:amp;)?R=(\d+)&(?:amp;)?A=(\d+)/i
    ];
    
    
    for (const regex of imageUrlPatterns) {
        const imageMatch = html.match(regex);
        if (imageMatch) {
            seats['Ap'] = parseInt(imageMatch[1] || '0', 10);
            seats['Høyre'] = parseInt(imageMatch[2] || '0', 10);
            seats['Frp'] = parseInt(imageMatch[3] || '0', 10);
            seats['SV'] = parseInt(imageMatch[4] || '0', 10);
            seats['Sp'] = parseInt(imageMatch[5] || '0', 10);
            seats['KrF'] = parseInt(imageMatch[6] || '0', 10);
            seats['Venstre'] = parseInt(imageMatch[7] || '0', 10);
            seats['MDG'] = parseInt(imageMatch[8] || '0', 10);
            seats['Rødt'] = parseInt(imageMatch[9] || '0', 10);
            seats['Andre'] = parseInt(imageMatch[10] || '0', 10);
            
            return seats;
        }
    }
    
    // Fallback: Look for the main mandate table if image URL parsing fails
    // Look for party rows in the table with seat counts - use first working pattern only
    const partyRowRegex = /<th[^>]*>([^<]+)<\/th>(?:[^<]*<td[^>]*>[^<]*<\/td>){3}\s*<td[^>]*>(\d+)<\/td>/gi;
    let match;
    const foundParties = new Set<string>();
    
    while ((match = partyRowRegex.exec(html)) !== null) {
        const partyCode = match[1]?.trim();
        const seatCount = parseInt(match[2] || '0', 10);
        
        // Skip if we already found this party (avoid duplicates)
        if (foundParties.has(partyCode)) continue;
        foundParties.add(partyCode);
        
        // Map party codes to our names
        if (partyCode && !isNaN(seatCount)) {
            switch (partyCode) {
                case 'Ap':
                    seats['Ap'] = seatCount;
                    break;
                case 'Høyre':
                case 'H':
                    seats['Høyre'] = seatCount;
                    break;
                case 'Frp':
                    seats['Frp'] = seatCount;
                    break;
                case 'SV':
                    seats['SV'] = seatCount;
                    break;
                case 'Sp':
                    seats['Sp'] = seatCount;
                    break;
                case 'KrF':
                    seats['KrF'] = seatCount;
                    break;
                case 'V':
                case 'Venstre':
                    seats['Venstre'] = seatCount;
                    break;
                case 'MDG':
                    seats['MDG'] = seatCount;
                    break;
                case 'R':
                case 'Rødt':
                    seats['Rødt'] = seatCount;
                    break;
                case 'A':
                case 'Andre':
                    seats['Andre'] = seatCount;
                    break;
                }
            }
    }
    
    return seats;
}

/**
 * Fetch seat projections from Poll of Polls
 */
export async function fetchSeatProjections(standings: CurrentStandings): Promise<SeatProjection> {
    const url = buildPollOfPollsUrl(standings);
    
    console.log(`🌐 Henter mandatberegning fra Poll of Polls...`);
    console.log(`📊 URL: ${url}`);
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const seatAllocations = parseSeatAllocationTable(html);
        
        // Build seat projections matching our interface
        const projections = standings.standings.map(party => ({
            party: party.party,
            displayName: party.displayName,
            percentage: party.percentage,
            seats: seatAllocations[party.party] || 0,
            aboveThreshold: party.percentage >= 4.0
        }));
        
        const totalSeats = Object.values(seatAllocations).reduce((sum, seats) => sum + seats, 0);
        const eligibleParties = projections.filter(p => p.aboveThreshold && p.party !== 'Andre').length;
        const thresholdParties = projections.filter(p => !p.aboveThreshold || p.party === 'Andre').length;
        
        return {
            date: standings.date,
            lookbackDays: standings.lookbackDays,
            pollCount: standings.pollCount,
            houses: standings.houses,
            totalSeats: totalSeats || 169,
            threshold: 4.0,
            eligibleParties,
            thresholdParties,
            projections
        };
        
    } catch (error) {
        console.error('❌ Feil ved henting fra Poll of Polls:', error);
        throw new Error(`Kunne ikke hente mandatberegning fra Poll of Polls: ${error}`);
    }
}

/**
 * Party bloc definitions for Norwegian politics
 * Note: "Andre" (Others) excluded as it represents aggregate of minor parties, not a real party
 */
const PARTY_BLOCS = {
    red: ['Ap', 'SV', 'Sp', 'Rødt', 'MDG'], // Red-green bloc
    blue: ['Høyre', 'Frp', 'KrF', 'Venstre'], // Conservative bloc
    other: [] as string[], // No "other" parties get seats in Norwegian system
} as const;

/**
 * Calculate bloc analysis from seat projections
 */
export function calculateBlocAnalysis(seatProjection: SeatProjection): BlocAnalysis {
    const redSeats = PARTY_BLOCS.red.reduce((sum, party) => {
        const projection = seatProjection.projections.find((p) => p.party === party);
        return sum + (projection?.seats || 0);
    }, 0);

    const blueSeats = PARTY_BLOCS.blue.reduce((sum, party) => {
        const projection = seatProjection.projections.find((p) => p.party === party);
        return sum + (projection?.seats || 0);
    }, 0);

    const otherSeats = PARTY_BLOCS.other.reduce((sum, party) => {
        const projection = seatProjection.projections.find((p) => p.party === party);
        return sum + (projection?.seats || 0);
    }, 0);

    const redPercentage = seatProjection.projections
        .filter((p) => PARTY_BLOCS.red.includes(p.party as any))
        .reduce((sum, p) => sum + p.percentage, 0);

    const bluePercentage = seatProjection.projections
        .filter((p) => PARTY_BLOCS.blue.includes(p.party as any))
        .reduce((sum, p) => sum + p.percentage, 0);

    const otherPercentage = seatProjection.projections
        .filter((p) => PARTY_BLOCS.other.includes(p.party as any))
        .reduce((sum, p) => sum + p.percentage, 0);

    return {
        date: seatProjection.date,
        lookbackDays: seatProjection.lookbackDays,
        pollCount: seatProjection.pollCount,
        houses: seatProjection.houses,
        totalSeats: seatProjection.totalSeats,
        majority: Math.floor(seatProjection.totalSeats / 2) + 1, // 85 seats
        blocs: {
            red: {
                name: 'Rød-grønn',
                parties: PARTY_BLOCS.red,
                seats: redSeats,
                percentage: redPercentage,
                hasMajority: redSeats >= Math.floor(seatProjection.totalSeats / 2) + 1,
            },
            blue: {
                name: 'Borgerlig',
                parties: PARTY_BLOCS.blue,
                seats: blueSeats,
                percentage: bluePercentage,
                hasMajority: blueSeats >= Math.floor(seatProjection.totalSeats / 2) + 1,
            },
            other: {
                name: 'Andre',
                parties: PARTY_BLOCS.other,
                seats: otherSeats,
                percentage: otherPercentage,
                hasMajority: false,
            },
        },
    };
}