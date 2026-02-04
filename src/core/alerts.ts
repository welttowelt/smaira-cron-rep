/**
 * Smaira Alerts Module
 * Price and volume alert system
 */

import { TokenMarketData, fetchMarketData } from './markets.js';
import { getConfig } from '../utils/config.js';
import logger from '../utils/logger.js';

export interface AlertConfig {
    priceChangeThreshold: number;
    volumeSpikeThreshold: number;
    watchlist?: string[];
}

export interface Alert {
    type: 'price_surge' | 'price_drop' | 'volume_spike' | 'new_token';
    symbol: string;
    message: string;
    value: number;
    threshold: number;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
}

export interface AlertState {
    lastPrices: Map<string, number>;
    lastVolumes: Map<string, number>;
    lastCheck: Date;
    knownTokens: Set<string>;
}

// In-memory state (would persist to file in production)
let state: AlertState = {
    lastPrices: new Map(),
    lastVolumes: new Map(),
    lastCheck: new Date(),
    knownTokens: new Set(),
};

/**
 * Check for price and volume alerts
 */
export async function checkAlerts(config?: Partial<AlertConfig>): Promise<Alert[]> {
    const defaultConfig = getConfig();
    const alertConfig: AlertConfig = {
        priceChangeThreshold: config?.priceChangeThreshold ?? defaultConfig.alerts.priceChangeThreshold,
        volumeSpikeThreshold: config?.volumeSpikeThreshold ?? defaultConfig.alerts.volumeSpikeThreshold,
        watchlist: config?.watchlist ?? defaultConfig.watchlist,
    };

    logger.info('Checking for alerts...', alertConfig);

    const tokens = await fetchMarketData();
    const alerts: Alert[] = [];

    for (const token of tokens) {
        // Skip tokens not in watchlist if watchlist is defined
        if (alertConfig.watchlist?.length && !alertConfig.watchlist.includes(token.symbol.toUpperCase())) {
            continue;
        }

        // Check price change
        if (Math.abs(token.priceChange24h) >= alertConfig.priceChangeThreshold) {
            const isUp = token.priceChange24h > 0;
            alerts.push({
                type: isUp ? 'price_surge' : 'price_drop',
                symbol: token.symbol,
                message: `${token.symbol} ${isUp ? 'surged' : 'dropped'} ${Math.abs(token.priceChange24h).toFixed(2)}% in 24h`,
                value: token.priceChange24h,
                threshold: alertConfig.priceChangeThreshold,
                timestamp: new Date(),
                severity: Math.abs(token.priceChange24h) > 20 ? 'high' : Math.abs(token.priceChange24h) > 10 ? 'medium' : 'low',
            });
        }

        // Check volume spike
        const lastVolume = state.lastVolumes.get(token.address);
        if (lastVolume && lastVolume > 0) {
            const volumeChange = ((token.volume24h - lastVolume) / lastVolume) * 100;
            if (volumeChange >= alertConfig.volumeSpikeThreshold) {
                alerts.push({
                    type: 'volume_spike',
                    symbol: token.symbol,
                    message: `${token.symbol} volume spiked ${volumeChange.toFixed(0)}%`,
                    value: volumeChange,
                    threshold: alertConfig.volumeSpikeThreshold,
                    timestamp: new Date(),
                    severity: volumeChange > 500 ? 'high' : volumeChange > 300 ? 'medium' : 'low',
                });
            }
        }

        // Check for new tokens
        if (!state.knownTokens.has(token.address) && token.verified) {
            alerts.push({
                type: 'new_token',
                symbol: token.symbol,
                message: `New verified token: ${token.symbol} (${token.name})`,
                value: 0,
                threshold: 0,
                timestamp: new Date(),
                severity: 'medium',
            });
        }

        // Update state
        state.lastPrices.set(token.address, token.priceUsd);
        state.lastVolumes.set(token.address, token.volume24h);
        state.knownTokens.add(token.address);
    }

    state.lastCheck = new Date();

    logger.info(`Found ${alerts.length} alerts`);
    return alerts;
}

/**
 * Format alerts for output
 */
export function formatAlerts(alerts: Alert[]): string {
    if (alerts.length === 0) {
        return 'No active alerts.';
    }

    const lines = ['# 🚨 Smaira Alerts', '', `Generated: ${new Date().toISOString()}`, ''];

    const byType: Record<string, Alert[]> = {};
    for (const alert of alerts) {
        if (!byType[alert.type]) byType[alert.type] = [];
        byType[alert.type].push(alert);
    }

    if (byType.price_surge?.length) {
        lines.push('## 📈 Price Surges');
        for (const a of byType.price_surge) {
            lines.push(`- **${a.symbol}**: +${a.value.toFixed(2)}%`);
        }
        lines.push('');
    }

    if (byType.price_drop?.length) {
        lines.push('## 📉 Price Drops');
        for (const a of byType.price_drop) {
            lines.push(`- **${a.symbol}**: ${a.value.toFixed(2)}%`);
        }
        lines.push('');
    }

    if (byType.volume_spike?.length) {
        lines.push('## 📊 Volume Spikes');
        for (const a of byType.volume_spike) {
            lines.push(`- **${a.symbol}**: +${a.value.toFixed(0)}% volume`);
        }
        lines.push('');
    }

    if (byType.new_token?.length) {
        lines.push('## 🆕 New Tokens');
        for (const a of byType.new_token) {
            lines.push(`- ${a.message}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Get current alert state
 */
export function getAlertState(): AlertState {
    return { ...state };
}

/**
 * Reset alert state
 */
export function resetAlertState(): void {
    state = {
        lastPrices: new Map(),
        lastVolumes: new Map(),
        lastCheck: new Date(),
        knownTokens: new Set(),
    };
}

export default {
    checkAlerts,
    formatAlerts,
    getAlertState,
    resetAlertState,
};
