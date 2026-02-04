/**
 * Smaira Markets Module
 * Market data fetching and analysis using AVNU SDK
 */

import { getMarketData, fetchTokens } from '@avnu/avnu-sdk';
import { getConfig, TOKEN_ADDRESSES } from '../utils/config.js';
import logger from '../utils/logger.js';

export interface TokenMarketData {
    symbol: string;
    name: string;
    address: string;
    priceUsd: number;
    marketCap?: number;
    volume24h: number;
    priceChange24h: number;
    liquidity?: number;
    verified: boolean;
    lastUpdated: Date;
}

export interface MarketSnapshot {
    timestamp: Date;
    network: string;
    tokenCount: number;
    totalVolume24h: number;
    topByVolume: TokenMarketData[];
    topGainers: TokenMarketData[];
    topLosers: TokenMarketData[];
    watchlist: TokenMarketData[];
}

/**
 * Fetch all market data from AVNU
 */
export async function fetchMarketData(): Promise<TokenMarketData[]> {
    logger.info('Fetching market data from AVNU...');

    const rawData = await getMarketData();

    const tokens: TokenMarketData[] = rawData.map(t => ({
        symbol: t.symbol,
        name: t.name,
        address: t.address,
        priceUsd: t.starknet?.usd || 0,
        marketCap: t.global?.usdMarketCap,
        volume24h: t.starknet?.usdVolume24h || 0,
        priceChange24h: t.starknet?.usdPriceChangePercentage24h || 0,
        liquidity: t.starknet?.usdLiquidity,
        verified: t.tags?.includes('Community') || t.tags?.includes('AVNU') || false,
        lastUpdated: new Date(),
    }));

    logger.info(`Fetched ${tokens.length} tokens`);
    return tokens;
}

/**
 * Get a full market snapshot with analysis
 */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
    const config = getConfig();
    const allTokens = await fetchMarketData();

    // Filter tokens with volume
    const activeTokens = allTokens.filter(t => t.volume24h > 0);

    // Sort by different metrics
    const byVolume = [...activeTokens].sort((a, b) => b.volume24h - a.volume24h);
    const byGain = [...activeTokens]
        .filter(t => t.priceChange24h > 0)
        .sort((a, b) => b.priceChange24h - a.priceChange24h);
    const byLoss = [...activeTokens]
        .filter(t => t.priceChange24h < 0)
        .sort((a, b) => a.priceChange24h - b.priceChange24h);

    // Get watchlist tokens
    const watchlistTokens = allTokens.filter(
        t => config.watchlist.includes(t.symbol.toUpperCase())
    );

    const totalVolume = activeTokens.reduce((sum, t) => sum + t.volume24h, 0);

    return {
        timestamp: new Date(),
        network: config.network,
        tokenCount: allTokens.length,
        totalVolume24h: totalVolume,
        topByVolume: byVolume.slice(0, 20),
        topGainers: byGain.slice(0, 10),
        topLosers: byLoss.slice(0, 10),
        watchlist: watchlistTokens,
    };
}

/**
 * Get price for a specific token by symbol
 */
export async function getTokenPrice(symbol: string): Promise<number | null> {
    const allTokens = await fetchMarketData();
    const token = allTokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
    return token?.priceUsd || null;
}

/**
 * Get verified tokens list
 */
export async function getVerifiedTokens(): Promise<TokenMarketData[]> {
    const allTokens = await fetchMarketData();
    return allTokens.filter(t => t.verified);
}

/**
 * Compare current prices to a previous snapshot
 */
export function comparePrices(
    current: TokenMarketData[],
    previous: TokenMarketData[]
): { symbol: string; current: number; previous: number; change: number }[] {
    return current
        .map(c => {
            const p = previous.find(t => t.address === c.address);
            if (!p || p.priceUsd === 0) return null;

            return {
                symbol: c.symbol,
                current: c.priceUsd,
                previous: p.priceUsd,
                change: ((c.priceUsd - p.priceUsd) / p.priceUsd) * 100,
            };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

export default {
    fetchMarketData,
    getMarketSnapshot,
    getTokenPrice,
    getVerifiedTokens,
    comparePrices,
};
