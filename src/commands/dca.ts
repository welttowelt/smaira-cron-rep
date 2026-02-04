/**
 * Smaira CLI - DCA Command
 * Analyze DCA opportunities
 */

import { analyzeDCA, formatDCAAnalysis, DCAParams } from '../dca/engine.js';
import { logger } from '../utils/logger.js';

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 4) {
        console.log(`
Usage: npm run dca <sellToken> <buyToken> <totalAmount> <frequency>

Example: npm run dca USDC STRK 100 weekly

Frequencies: hourly, daily, weekly, monthly
    `);
        return;
    }

    const [sellToken, buyToken, amount, frequency] = args;

    const params: DCAParams = {
        sellToken,
        buyToken,
        totalAmount: parseFloat(amount),
        frequency: frequency as DCAParams['frequency'],
    };

    logger.info('Analyzing DCA strategy...', params);

    const analysis = await analyzeDCA(params);
    console.log('\n' + formatDCAAnalysis(analysis));
}

main().catch(error => {
    logger.error('Failed to analyze DCA:', error);
    process.exit(1);
});
