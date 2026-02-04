/**
 * Smaira CLI - Alerts Command
 * Check for price and volume alerts
 */

import { checkAlerts, formatAlerts } from '../core/alerts.js';
import { logger } from '../utils/logger.js';

async function main() {
    logger.info('Checking for alerts...');

    const alerts = await checkAlerts();
    console.log('\n' + formatAlerts(alerts));

    if (alerts.length > 0) {
        logger.warn(`Found ${alerts.length} active alerts`);
    } else {
        logger.info('No alerts triggered');
    }
}

main().catch(error => {
    logger.error('Failed to check alerts:', error);
    process.exit(1);
});
