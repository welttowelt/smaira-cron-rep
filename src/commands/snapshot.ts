/**
 * Smaira CLI - Snapshot Command
 * Get current market snapshot
 */

import { generateSnapshotReport } from '../reports/generator.js';
import { logger } from '../utils/logger.js';

async function main() {
    logger.info('Generating market snapshot...');

    const report = await generateSnapshotReport();
    console.log('\n' + report.content);
}

main().catch(error => {
    logger.error('Failed to generate snapshot:', error);
    process.exit(1);
});
