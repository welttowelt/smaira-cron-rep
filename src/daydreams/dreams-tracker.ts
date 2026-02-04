/**
 * $DREAMS Token Tracker
 * Monitors the Daydreams token across Starknet, Solana, and Base
 */

import { getConfig, AVNU_ENDPOINTS } from '../utils/config.js';
import logger from '../utils/logger.js';

// $DREAMS Token Addresses
export const DREAMS_TOKENS = {
    starknet: {
        address: '0x04fcaf2a7b4a072fe57c59beee807322d34ed65000d78611c909a46fead07fb1',
        explorer: 'https://starkscan.co/token/',
        decimals: 18,
    },
    base: {
        address: '0x176383016BB310C9f1C180DC6729d5E28104e602',
        explorer: 'https://basescan.org/address/',
        decimals: 18,
    },
    solana: {
        address: 'GMzuntWYJLpNuCizrSR7ZXggiMdDzTNiEmSNHHunpump',
        explorer: 'https://solscan.io/token/',
        decimals: 6,
    },
};

// Bridge URLs
export const DREAMS_BRIDGES = {
    solanaToBase: 'https://bridge.daydreams.systems/',
    solanaToStarknet: 'https://nexus.hyperlane.xyz/?origin=solanamainnet&destination=starknet',
};

export interface DreamsStats {
    network: string;
    address: string;
    price?: number;
    change24h?: number;
    volume24h?: number;
    holders?: number;
    lastUpdated: Date;
}

/**
 * Fetch $DREAMS stats from Starknet via AVNU
 */
export async function fetchDreamsFromAVNU(): Promise<DreamsStats | null> {
    try {
        const response = await fetch(`${AVNU_ENDPOINTS.mainnet}/v1/starknet/tokens?page=0&size=500`);
        if (!response.ok) return null;

        const data = await response.json();
        const tokens = data.content || [];

        // Find DREAMS token
        const dreamsToken = tokens.find((t: any) =>
            t.address?.toLowerCase() === DREAMS_TOKENS.starknet.address.toLowerCase() ||
            t.symbol?.toUpperCase() === 'DREAMS'
        );

        if (!dreamsToken) {
            logger.warn('$DREAMS token not found in AVNU token list');
            return null;
        }

        return {
            network: 'starknet',
            address: DREAMS_TOKENS.starknet.address,
            volume24h: dreamsToken.lastDailyVolumeUsd || 0,
            lastUpdated: new Date(),
        };
    } catch (error) {
        logger.error('Failed to fetch $DREAMS from AVNU:', error);
        return null;
    }
}

/**
 * Fetch $DREAMS price from DexScreener (aggregates DEX data)
 */
export async function fetchDreamsFromDexScreener(): Promise<DreamsStats | null> {
    try {
        // DexScreener API for Base $DREAMS
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${DREAMS_TOKENS.base.address}`);
        if (!response.ok) return null;

        const data = await response.json();
        const pairs = data.pairs || [];

        if (pairs.length === 0) return null;

        // Get the most liquid pair
        const mainPair = pairs[0];

        return {
            network: 'base',
            address: DREAMS_TOKENS.base.address,
            price: parseFloat(mainPair.priceUsd) || 0,
            change24h: mainPair.priceChange?.h24 || 0,
            volume24h: mainPair.volume?.h24 || 0,
            lastUpdated: new Date(),
        };
    } catch (error) {
        logger.error('Failed to fetch $DREAMS from DexScreener:', error);
        return null;
    }
}

/**
 * Get comprehensive $DREAMS stats across chains
 */
export async function getDreamsStats(): Promise<{
    starknet: DreamsStats | null;
    base: DreamsStats | null;
    bridges: typeof DREAMS_BRIDGES;
}> {
    const [starknet, base] = await Promise.all([
        fetchDreamsFromAVNU(),
        fetchDreamsFromDexScreener(),
    ]);

    return {
        starknet,
        base,
        bridges: DREAMS_BRIDGES,
    };
}

/**
 * Format $DREAMS report for display
 */
export function formatDreamsReport(stats: {
    starknet: DreamsStats | null;
    base: DreamsStats | null;
}): string {
    let report = '# 💭 $DREAMS Token Report\n\n';

    if (stats.base) {
        report += '## Base\n';
        report += `- **Price**: $${stats.base.price?.toFixed(6) || 'N/A'}\n`;
        report += `- **24h Change**: ${stats.base.change24h?.toFixed(2) || 'N/A'}%\n`;
        report += `- **24h Volume**: $${(stats.base.volume24h || 0).toLocaleString()}\n\n`;
    }

    if (stats.starknet) {
        report += '## Starknet\n';
        report += `- **24h Volume**: $${(stats.starknet.volume24h || 0).toLocaleString()}\n\n`;
    }

    report += '## Bridges\n';
    report += `- [Solana ↔ Base](${DREAMS_BRIDGES.solanaToBase})\n`;
    report += `- [Solana ↔ Starknet (Hyperlane)](${DREAMS_BRIDGES.solanaToStarknet})\n`;

    return report;
}

export default {
    DREAMS_TOKENS,
    DREAMS_BRIDGES,
    getDreamsStats,
    formatDreamsReport,
};
