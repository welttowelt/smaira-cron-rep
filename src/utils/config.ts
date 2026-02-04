/**
 * Smaira Configuration
 * Environment and default settings
 */

import { config as dotenv } from 'dotenv';
dotenv();

export interface SmairaConfig {
    network: 'mainnet' | 'sepolia';
    watchlist: string[];
    alerts: {
        priceChangeThreshold: number; // percentage
        volumeSpikeThreshold: number; // percentage
    };
    reports: {
        outputDir: string;
        format: 'markdown' | 'json' | 'both';
    };
    cron: {
        snapshotInterval: string; // cron expression
        reportInterval: string;
        alertCheckInterval: string;
    };
}

export const defaultConfig: SmairaConfig = {
    network: (process.env.STARKNET_NETWORK as 'mainnet' | 'sepolia') || 'mainnet',
    watchlist: process.env.WATCHLIST?.split(',').map(s => s.trim()) || [
        'ETH', 'STRK', 'USDC', 'LORDS', 'ZEND', 'BROTHER', 'NSTR'
    ],
    alerts: {
        priceChangeThreshold: parseFloat(process.env.PRICE_CHANGE_THRESHOLD || '5'),
        volumeSpikeThreshold: parseFloat(process.env.VOLUME_SPIKE_THRESHOLD || '200'),
    },
    reports: {
        outputDir: process.env.REPORTS_DIR || './reports',
        format: (process.env.OUTPUT_FORMAT as 'markdown' | 'json' | 'both') || 'markdown',
    },
    cron: {
        snapshotInterval: process.env.SNAPSHOT_CRON || '0 */6 * * *', // every 6 hours
        reportInterval: process.env.REPORT_CRON || '0 7 * * *', // daily at 7am
        alertCheckInterval: process.env.ALERT_CRON || '*/15 * * * *', // every 15 min
    },
};

export const AVNU_ENDPOINTS = {
    mainnet: 'https://starknet.api.avnu.fi',
    sepolia: 'https://sepolia.api.avnu.fi',
};

// Common token addresses (mainnet)
export const TOKEN_ADDRESSES: Record<string, { address: string; decimals: number }> = {
    ETH: { address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', decimals: 18 },
    STRK: { address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', decimals: 18 },
    USDC: { address: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8', decimals: 6 },
    USDT: { address: '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8', decimals: 6 },
    DAI: { address: '0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3', decimals: 18 },
    WBTC: { address: '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac', decimals: 8 },
    LORDS: { address: '0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49', decimals: 18 },
    ZEND: { address: '0x00585c32b625999e6e5e78645ff8df7a9001cf5cf3eb6b80ccdd16cb64bd3a34', decimals: 18 },
    BROTHER: { address: '0x03b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee', decimals: 18 },
    NSTR: { address: '0x04d74d2d1f9e8c7cc4f22fce00a6bda5f6c5ece0c3b5f76d6e3b5c2e8f9a1b2c3', decimals: 18 },
};

export function getConfig(): SmairaConfig {
    return { ...defaultConfig };
}
