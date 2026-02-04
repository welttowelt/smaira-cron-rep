/**
 * Daydreams Router Client
 * OpenAI-compatible API with x402 payment support
 */

import logger from '../utils/logger.js';

// Router endpoints
export const DAYDREAMS_ENDPOINTS = {
    router: 'https://router.daydreams.systems/v1',
    modelsApi: 'https://api-beta.daydreams.systems/v1',
    xgate: 'https://xgate.run',
    facilitator: 'https://facilitator.daydreams.systems',
};

export interface RouterModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
    max_tokens?: number;
}

export interface PaymentInfo {
    required: boolean;
    amount?: string;
    currency?: string;
    address?: string;
    network?: string;
}

/**
 * Fetch available models from Daydreams Router
 */
export async function fetchRouterModels(): Promise<RouterModel[]> {
    try {
        const response = await fetch(`${DAYDREAMS_ENDPOINTS.modelsApi}/models`);
        if (!response.ok) return [];

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        logger.error('Failed to fetch router models:', error);
        return [];
    }
}

/**
 * Check if endpoint requires x402 payment
 */
export async function checkPaymentRequired(endpoint: string): Promise<PaymentInfo> {
    try {
        // Make a request without auth to trigger 402 if required
        const response = await fetch(endpoint, {
            method: 'OPTIONS',
        });

        if (response.status === 402) {
            // Parse payment header
            const paymentHeader = response.headers.get('X-Payment-Required') ||
                response.headers.get('Payment-Required');

            return {
                required: true,
                amount: paymentHeader || 'Check endpoint',
            };
        }

        return { required: false };
    } catch {
        return { required: false };
    }
}

/**
 * Create x402 payment header (simplified - real impl uses wallet signing)
 */
export function createPaymentHeader(walletAddress: string, amount: string): Record<string, string> {
    // In production, this would:
    // 1. Create ERC-2612 permit
    // 2. Sign with wallet
    // 3. Return proper x402 headers

    // For now, return placeholder structure
    return {
        'X-Payment': JSON.stringify({
            wallet: walletAddress,
            amount,
            timestamp: Date.now(),
        }),
    };
}

/**
 * Chat completion via Daydreams Router
 * Supports both API key and x402 payment auth
 */
export async function chatCompletion(
    request: ChatCompletionRequest,
    auth: { apiKey?: string; walletAddress?: string; paymentAmount?: string }
): Promise<{ content: string; model: string; usage?: any } | null> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Auth method
        if (auth.apiKey) {
            headers['Authorization'] = `Bearer ${auth.apiKey}`;
        } else if (auth.walletAddress && auth.paymentAmount) {
            Object.assign(headers, createPaymentHeader(auth.walletAddress, auth.paymentAmount));
        }

        const response = await fetch(`${DAYDREAMS_ENDPOINTS.router}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ...request,
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`Router error: ${response.status}`);
        }

        const data = await response.json();

        return {
            content: data.choices?.[0]?.message?.content || '',
            model: data.model,
            usage: data.usage,
        };
    } catch (error) {
        logger.error('Chat completion failed:', error);
        return null;
    }
}

/**
 * xGate resource discovery
 */
export interface XGateResource {
    id: string;
    name: string;
    description: string;
    price: string;
    endpoint: string;
}

export async function discoverXGateResources(): Promise<XGateResource[]> {
    try {
        // xGate requires auth for full resource list
        // This returns public/featured resources
        const response = await fetch(`${DAYDREAMS_ENDPOINTS.xgate}/api/public/resources`);
        if (!response.ok) return [];

        return await response.json();
    } catch {
        // xGate API may not be public - return empty
        return [];
    }
}

/**
 * Format Daydreams ecosystem status
 */
export function formatDaydreamsStatus(): string {
    return `
# 🌙 Daydreams Ecosystem

## Endpoints
- **Router**: ${DAYDREAMS_ENDPOINTS.router}
- **xGate**: ${DAYDREAMS_ENDPOINTS.xgate}
- **Facilitator**: ${DAYDREAMS_ENDPOINTS.facilitator}

## Payment Methods
1. **API Key** - Bearer token auth
2. **x402 Pay-per-use** - Wallet-signed permits (USDC)

## Networks
- Base, Solana, Abstract, Polygon (active)
- Starknet (coming soon via z402)
`.trim();
}

export default {
    DAYDREAMS_ENDPOINTS,
    fetchRouterModels,
    checkPaymentRequired,
    chatCompletion,
    discoverXGateResources,
    formatDaydreamsStatus,
};
