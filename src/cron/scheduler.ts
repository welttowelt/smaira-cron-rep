/**
 * Smaira Cron Scheduler
 * Automated job scheduling for reports and alerts
 */

import cron, { ScheduledTask } from 'node-cron';
import { generateReport, saveReport } from '../reports/generator.js';
import { checkAlerts, formatAlerts } from '../core/alerts.js';
import { getConfig } from '../utils/config.js';
import logger from '../utils/logger.js';

export interface CronJob {
    name: string;
    schedule: string;
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    task: () => Promise<void>;
}

const scheduledTasks: Map<string, ScheduledTask> = new Map();
const jobStatus: Map<string, { lastRun?: Date; lastError?: string }> = new Map();

/**
 * Default job definitions
 */
function getDefaultJobs(): CronJob[] {
    const config = getConfig();

    return [
        {
            name: 'market-snapshot',
            schedule: config.cron.snapshotInterval,
            enabled: true,
            task: async () => {
                logger.info('Running market snapshot...');
                const report = await generateReport('snapshot');
                await saveReport(report);
                logger.info('Snapshot complete');
            },
        },
        {
            name: 'daily-report',
            schedule: config.cron.reportInterval,
            enabled: true,
            task: async () => {
                logger.info('Running daily report...');
                const report = await generateReport('daily');
                await saveReport(report);
                logger.info('Daily report complete');
            },
        },
        {
            name: 'alert-check',
            schedule: config.cron.alertCheckInterval,
            enabled: true,
            task: async () => {
                logger.info('Checking alerts...');
                const alerts = await checkAlerts();
                if (alerts.length > 0) {
                    logger.warn(`Found ${alerts.length} alerts!`);
                    // Could send to webhook/notification here
                    console.log(formatAlerts(alerts));
                }
            },
        },
    ];
}

/**
 * Schedule a job
 */
export function scheduleJob(job: CronJob): void {
    if (scheduledTasks.has(job.name)) {
        logger.warn(`Job ${job.name} already scheduled, stopping old one`);
        scheduledTasks.get(job.name)?.stop();
    }

    if (!cron.validate(job.schedule)) {
        throw new Error(`Invalid cron expression: ${job.schedule}`);
    }

    const task = cron.schedule(job.schedule, async () => {
        try {
            await job.task();
            jobStatus.set(job.name, { lastRun: new Date() });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`Job ${job.name} failed: ${errorMsg}`);
            jobStatus.set(job.name, { lastRun: new Date(), lastError: errorMsg });
        }
    }, {
        scheduled: job.enabled,
        timezone: 'Europe/Zurich',
    });

    scheduledTasks.set(job.name, task);
    logger.info(`Scheduled job: ${job.name} (${job.schedule})`);
}

/**
 * Start the scheduler with default jobs
 */
export function startScheduler(): void {
    logger.info('Starting Smaira Cron Scheduler...');

    const jobs = getDefaultJobs();
    for (const job of jobs) {
        scheduleJob(job);
    }

    logger.info(`Scheduler running with ${jobs.length} jobs`);

    // Print next run times
    console.log('\n📅 Scheduled Jobs:');
    for (const job of jobs) {
        console.log(`  - ${job.name}: ${job.schedule}`);
    }
    console.log('\nPress Ctrl+C to stop.\n');
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler(): void {
    for (const [name, task] of scheduledTasks) {
        task.stop();
        logger.info(`Stopped job: ${name}`);
    }
    scheduledTasks.clear();
}

/**
 * Get status of all jobs
 */
export function getJobStatus(): Record<string, { lastRun?: Date; lastError?: string }> {
    return Object.fromEntries(jobStatus);
}

/**
 * Run a specific job immediately
 */
export async function runJobNow(jobName: string): Promise<void> {
    const jobs = getDefaultJobs();
    const job = jobs.find(j => j.name === jobName);

    if (!job) {
        throw new Error(`Unknown job: ${jobName}`);
    }

    logger.info(`Running job immediately: ${jobName}`);
    await job.task();
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    startScheduler();

    // Keep process running
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        stopScheduler();
        process.exit(0);
    });
}

export default {
    scheduleJob,
    startScheduler,
    stopScheduler,
    getJobStatus,
    runJobNow,
};
