/**
 * Daydreams Module - Index
 * Exports all Daydreams-related functionality
 */

export {
    DREAMS_TOKENS,
    DREAMS_BRIDGES,
    getDreamsStats,
    fetchDreamsFromAVNU,
    fetchDreamsFromDexScreener,
    formatDreamsReport,
} from './dreams-tracker.js';

export type { DreamsStats } from './dreams-tracker.js';

export {
    DAYDREAMS_ENDPOINTS,
    fetchRouterModels,
    checkPaymentRequired,
    chatCompletion,
    discoverXGateResources,
    formatDaydreamsStatus,
    createPaymentHeader,
} from './router.js';

export type {
    RouterModel,
    ChatMessage,
    ChatCompletionRequest,
    PaymentInfo,
    XGateResource,
} from './router.js';
