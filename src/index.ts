/**
 * Smaira - Main Entry Point
 * Starknet Market Intelligence & Automated Reporting Agent
 */

// Core modules
export { fetchMarketData, getMarketSnapshot, getTokenPrice, getVerifiedTokens } from './core/markets.js';
export type { TokenMarketData, MarketSnapshot } from './core/markets.js';

export { checkAlerts, formatAlerts, getAlertState, resetAlertState } from './core/alerts.js';
export type { Alert, AlertConfig, AlertState } from './core/alerts.js';

// DCA
export { analyzeDCA, formatDCAAnalysis } from './dca/engine.js';
export type { DCAParams, DCAAnalysis, DCAOrder } from './dca/engine.js';

// Reports
export { generateReport, saveReport, generateSnapshotReport, generateDailyReport } from './reports/generator.js';
export type { Report, ReportType } from './reports/generator.js';

// Cron
export { scheduleJob, startScheduler, stopScheduler, getJobStatus, runJobNow } from './cron/scheduler.js';
export type { CronJob } from './cron/scheduler.js';

// Utils
export { getConfig, AVNU_ENDPOINTS, TOKEN_ADDRESSES } from './utils/config.js';
export type { SmairaConfig } from './utils/config.js';

export { logger } from './utils/logger.js';

/**
 * Smaira Class - Unified API
 */
import { getMarketSnapshot, fetchMarketData, getTokenPrice, TokenMarketData, MarketSnapshot } from './core/markets.js';
import { checkAlerts, Alert, AlertConfig } from './core/alerts.js';
import { analyzeDCA, DCAParams, DCAAnalysis } from './dca/engine.js';
import { generateReport, saveReport, Report, ReportType } from './reports/generator.js';
import { startScheduler, stopScheduler, runJobNow } from './cron/scheduler.js';
import { getConfig, SmairaConfig } from './utils/config.js';
import { logger } from './utils/logger.js';

export class Smaira {
    private config: SmairaConfig;

    constructor(config?: Partial<SmairaConfig>) {
        this.config = { ...getConfig(), ...config };
        logger.info('Smaira initialized');
    }

    // Market Data
    async getSnapshot(): Promise<MarketSnapshot> {
        return getMarketSnapshot();
    }

    async getTopByVolume(count: number = 10): Promise<TokenMarketData[]> {
        const snapshot = await getMarketSnapshot();
        return snapshot.topByVolume.slice(0, count);
    }

    async getPrice(symbol: string): Promise<number | null> {
        return getTokenPrice(symbol);
    }

    async getAllTokens(): Promise<TokenMarketData[]> {
        return fetchMarketData();
    }

    // Alerts
    async checkAlerts(config?: Partial<AlertConfig>): Promise<Alert[]> {
        return checkAlerts(config);
    }

    // DCA
    async analyzeDCA(params: DCAParams): Promise<DCAAnalysis> {
        return analyzeDCA(params);
    }

    // Reports
    async generateReport(type: ReportType = 'snapshot'): Promise<Report> {
        return generateReport(type);
    }

    async generateAndSaveReport(type: ReportType = 'snapshot', path?: string): Promise<string> {
        const report = await generateReport(type);
        return saveReport(report, path);
    }

    // Cron
    startScheduler(): void {
        startScheduler();
    }

    stopScheduler(): void {
        stopScheduler();
    }

    async runJob(jobName: string): Promise<void> {
        return runJobNow(jobName);
    }

    // Config
    getConfig(): SmairaConfig {
        return this.config;
    }
}

export default Smaira;
