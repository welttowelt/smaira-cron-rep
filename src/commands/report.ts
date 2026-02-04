/**
 * Smaira CLI - Report Command
 * Generate full market report
 */

import { generateDailyReport, saveReport } from '../reports/generator.js';
import { logger } from '../utils/logger.js';

async function main() {
    logger.info('Generating daily report...');

    const report = await generateDailyReport();
    console.log('\n' + report.content);

    const path = await saveReport(report);
    logger.info(`Report saved to: ${path}`);
}

main().catch(error => {
    logger.error('Failed to generate report:', error);
    process.exit(1);
});
