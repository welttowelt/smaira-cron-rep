/**
 * Smaira DCA Module
 * Dollar Cost Averaging analysis and tracking
 */

import { getQuotes } from '@avnu/avnu-sdk';
import { parseUnits, formatUnits } from 'ethers';
import { TOKEN_ADDRESSES, getConfig } from '../utils/config.js';
import logger from '../utils/logger.js';

export interface DCAParams {
    sellToken: string;       // Symbol (e.g., 'USDC')
    buyToken: string;        // Symbol (e.g., 'STRK')
    totalAmount: number;     // Total to invest
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    duration?: number;       // Number of cycles (optional, default: continuous)
}

export interface DCAAnalysis {
    params: DCAParams;
    amountPerCycle: number;
    numberOfCycles: number;
    estimatedBuyAmount: number;
    currentPrice: number;
    estimatedAvgPrice: number;
    gasCostEstimate: number;
    recommendation: string;
}

export interface DCAOrder {
    id: string;
    params: DCAParams;
    createdAt: Date;
    status: 'active' | 'paused' | 'completed' | 'cancelled';
    executedCycles: number;
    totalSpent: number;
    totalAcquired: number;
    averagePrice: number;
    history: DCAExecution[];
}

export interface DCAExecution {
    timestamp: Date;
    sellAmount: number;
    buyAmount: number;
    price: number;
    gasFee: number;
    txHash?: string;
}

const FREQUENCY_SECONDS: Record<DCAParams['frequency'], number> = {
    hourly: 3600,
    daily: 86400,
    weekly: 604800,
    monthly: 2592000,
};

const FREQUENCY_CYCLES_PER_MONTH: Record<DCAParams['frequency'], number> = {
    hourly: 720,
    daily: 30,
    weekly: 4,
    monthly: 1,
};

/**
 * Analyze a potential DCA strategy
 */
export async function analyzeDCA(params: DCAParams): Promise<DCAAnalysis> {
    logger.info('Analyzing DCA opportunity...', params);

    const sellTokenInfo = TOKEN_ADDRESSES[params.sellToken.toUpperCase()];
    const buyTokenInfo = TOKEN_ADDRESSES[params.buyToken.toUpperCase()];

    if (!sellTokenInfo || !buyTokenInfo) {
        throw new Error(`Unknown token: ${params.sellToken} or ${params.buyToken}`);
    }

    // Calculate cycles
    const cyclesPerMonth = FREQUENCY_CYCLES_PER_MONTH[params.frequency];
    const numberOfCycles = params.duration || cyclesPerMonth * 3; // Default 3 months
    const amountPerCycle = params.totalAmount / numberOfCycles;

    // Get current quote for estimation
    const quotes = await getQuotes({
        sellTokenAddress: sellTokenInfo.address,
        buyTokenAddress: buyTokenInfo.address,
        sellAmount: parseUnits(amountPerCycle.toString(), sellTokenInfo.decimals),
        takerAddress: '0x0',
    });

    if (!quotes.length) {
        throw new Error('Could not get quote for DCA analysis');
    }

    const quote = quotes[0];
    const buyAmountPerCycle = parseFloat(formatUnits(quote.buyAmount, buyTokenInfo.decimals));
    const currentPrice = amountPerCycle / buyAmountPerCycle;
    const estimatedTotalBuy = buyAmountPerCycle * numberOfCycles;
    const gasCostPerCycle = quote.gasFees?.usd || 0.05;

    // Generate recommendation
    let recommendation: string;
    if (params.frequency === 'hourly') {
        recommendation = 'High frequency DCA may incur significant gas costs. Consider daily or weekly.';
    } else if (amountPerCycle < 10) {
        recommendation = 'Low amount per cycle. Gas costs may be disproportionate.';
    } else {
        recommendation = `${params.frequency.charAt(0).toUpperCase() + params.frequency.slice(1)} DCA looks reasonable for ${params.totalAmount} ${params.sellToken} → ${params.buyToken}.`;
    }

    return {
        params,
        amountPerCycle,
        numberOfCycles,
        estimatedBuyAmount: estimatedTotalBuy,
        currentPrice,
        estimatedAvgPrice: currentPrice, // In reality, this varies
        gasCostEstimate: gasCostPerCycle * numberOfCycles,
        recommendation,
    };
}

/**
 * Format DCA analysis for display
 */
export function formatDCAAnalysis(analysis: DCAAnalysis): string {
    const lines = [
        '# 💰 DCA Analysis',
        '',
        '## Strategy',
        `- **Sell**: ${analysis.params.totalAmount} ${analysis.params.sellToken}`,
        `- **Buy**: ${analysis.params.buyToken}`,
        `- **Frequency**: ${analysis.params.frequency}`,
        `- **Cycles**: ${analysis.numberOfCycles}`,
        `- **Per cycle**: ${analysis.amountPerCycle.toFixed(2)} ${analysis.params.sellToken}`,
        '',
        '## Estimates',
        `- **Current price**: $${analysis.currentPrice.toFixed(6)}`,
        `- **Est. total buy**: ${analysis.estimatedBuyAmount.toFixed(4)} ${analysis.params.buyToken}`,
        `- **Est. gas cost**: $${analysis.gasCostEstimate.toFixed(2)}`,
        '',
        '## Recommendation',
        analysis.recommendation,
    ];

    return lines.join('\n');
}

/**
 * Calculate simulated DCA performance over historical data
 * (Would require historical price data in production)
 */
export function simulateDCAPerformance(
    prices: { date: Date; price: number }[],
    amountPerCycle: number
): { totalSpent: number; totalAcquired: number; avgPrice: number } {
    let totalSpent = 0;
    let totalAcquired = 0;

    for (const { price } of prices) {
        const acquired = amountPerCycle / price;
        totalSpent += amountPerCycle;
        totalAcquired += acquired;
    }

    return {
        totalSpent,
        totalAcquired,
        avgPrice: totalSpent / totalAcquired,
    };
}

export default {
    analyzeDCA,
    formatDCAAnalysis,
    simulateDCAPerformance,
};
