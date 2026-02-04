/**
 * Smaira Frontend - App Logic
 * Connects to AVNU API for tokens/volume and CoinGecko for prices
 */

// ============ CONFIG ============
const AVNU_API = 'https://starknet.api.avnu.fi';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const REFRESH_INTERVAL = 60000; // 1 minute

// Default watchlist
let watchlist = JSON.parse(localStorage.getItem('smaira_watchlist')) ||
    ['ETH', 'STRK', 'USDC', 'LORDS', 'ZEND', 'BROTHER'];

// Alert config
let alertConfig = {
    priceChangeThreshold: parseFloat(localStorage.getItem('smaira_price_threshold')) || 5,
    volumeSpikeThreshold: parseFloat(localStorage.getItem('smaira_volume_threshold')) || 200
};

// State
let marketData = [];
let alerts = [];
let lastUpdate = null;

// Mapping from symbol to CoinGecko ID
const COINGECKO_IDS = {
    'ETH': 'ethereum',
    'STRK': 'starknet',
    'USDC': 'usd-coin',
    'USDC.e': 'usd-coin',
    'USDT': 'tether',
    'DAI': 'dai',
    'WBTC': 'wrapped-bitcoin',
    'LORDS': 'lords',
    'ZEND': 'zend',
    'BROTHER': 'starknet-brother',
    'NSTR': 'nostra',
};

// ============ API FUNCTIONS ============

async function fetchTokensFromAVNU() {
    try {
        const response = await fetch(`${AVNU_API}/v1/starknet/tokens?page=0&size=100`);
        if (!response.ok) throw new Error('AVNU API error');
        const data = await response.json();
        return data.content || [];
    } catch (error) {
        console.error('Failed to fetch tokens from AVNU:', error);
        return [];
    }
}

async function fetchPricesFromCoinGecko(ids) {
    try {
        const idsParam = ids.join(',');
        const response = await fetch(`${COINGECKO_API}/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`);
        if (!response.ok) throw new Error('CoinGecko API error');
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch prices from CoinGecko:', error);
        return {};
    }
}

async function fetchMarketData() {
    // Fetch tokens from AVNU
    const tokens = await fetchTokensFromAVNU();
    if (tokens.length === 0) {
        showToast('Failed to fetch market data', 'error');
        return [];
    }

    // Get unique CoinGecko IDs we need
    const cgIds = new Set();
    tokens.forEach(t => {
        const id = t.extensions?.coingeckoId || COINGECKO_IDS[t.symbol];
        if (id) cgIds.add(id);
    });

    // Fetch prices from CoinGecko
    const prices = await fetchPricesFromCoinGecko([...cgIds]);

    // Merge data
    return tokens.map(token => {
        const cgId = token.extensions?.coingeckoId || COINGECKO_IDS[token.symbol];
        const priceData = prices[cgId] || {};

        return {
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            priceUsd: priceData.usd || 0,
            priceChange24h: priceData.usd_24h_change || 0,
            volume24h: token.lastDailyVolumeUsd || 0,
            marketCap: priceData.usd_market_cap || null,
            verified: token.tags?.includes('AVNU') || token.tags?.includes('Verified'),
            logoUri: token.logoUri,
            coingeckoId: cgId
        };
    });
}

async function fetchQuote(sellToken, buyToken, sellAmount) {
    try {
        const params = new URLSearchParams({
            sellTokenAddress: sellToken,
            buyTokenAddress: buyToken,
            sellAmount: sellAmount,
            takerAddress: '0x0'
        });
        const response = await fetch(`${AVNU_API}/swap/v2/quotes?${params}`);
        if (!response.ok) throw new Error('Quote API error');
        const data = await response.json();
        return data[0] || null;
    } catch (error) {
        console.error('Failed to fetch quote:', error);
        return null;
    }
}

// ============ TOKEN ADDRESSES ============

const TOKEN_INFO = {
    ETH: { address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', decimals: 18 },
    STRK: { address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', decimals: 18 },
    USDC: { address: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8', decimals: 6 },
    USDT: { address: '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8', decimals: 6 },
    DAI: { address: '0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3', decimals: 18 },
    LORDS: { address: '0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49', decimals: 18 },
    ZEND: { address: '0x00585c32b625999e6e5e78645ff8df7a9001cf5cf3eb6b80ccdd16cb64bd3a34', decimals: 18 },
    BROTHER: { address: '0x03b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee', decimals: 18 },
};

// ============ DATA PROCESSING ============

function processMarketData(raw) {
    // Data is already processed in fetchMarketData()
    return raw.filter(t => t.priceUsd > 0 || t.volume24h > 0);
}

function processAlerts(tokens) {
    const newAlerts = [];

    tokens.forEach(token => {
        if (Math.abs(token.priceChange24h) >= alertConfig.priceChangeThreshold) {
            const isUp = token.priceChange24h > 0;
            newAlerts.push({
                type: isUp ? 'surge' : 'drop',
                symbol: token.symbol,
                message: `${token.symbol} ${isUp ? 'surged' : 'dropped'} ${Math.abs(token.priceChange24h).toFixed(2)}%`,
                value: token.priceChange24h,
                timestamp: new Date()
            });
        }
    });

    return newAlerts;
}

// ============ UI RENDERING ============

function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return '--';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
}

function formatPrice(price) {
    if (price === null || price === undefined) return '--';
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
}

function formatChange(change) {
    if (change === null || change === undefined) return '--';
    const sign = change >= 0 ? '+' : '';
    const className = change >= 0 ? 'change-positive' : 'change-negative';
    return `<span class="${className}">${sign}${change.toFixed(2)}%</span>`;
}

function renderDashboard() {
    // Stats
    const activeTokens = marketData.filter(t => t.volume24h > 0);
    const totalVolume = activeTokens.reduce((sum, t) => sum + t.volume24h, 0);
    const topGainer = [...marketData].sort((a, b) => b.priceChange24h - a.priceChange24h)[0];

    document.getElementById('total-tokens').textContent = marketData.length;
    document.getElementById('total-volume').textContent = formatNumber(totalVolume);
    document.getElementById('top-gainer').innerHTML = topGainer
        ? `${topGainer.symbol} +${topGainer.priceChange24h.toFixed(1)}%`
        : '--';
    document.getElementById('active-alerts').textContent = alerts.length;

    // Top tokens table
    const topByVolume = [...marketData]
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, 10);

    const tableBody = document.querySelector('#top-tokens-table tbody');
    tableBody.innerHTML = topByVolume.map((t, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>
                <div class="token-cell">
                    <div class="token-logo">${t.symbol.charAt(0)}</div>
                    <div>
                        <strong>${t.symbol}</strong>
                        ${t.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                    </div>
                </div>
            </td>
            <td>${formatPrice(t.priceUsd)}</td>
            <td>${formatNumber(t.volume24h)}</td>
            <td>${formatChange(t.priceChange24h)}</td>
        </tr>
    `).join('');

    // Alerts
    renderAlertsList('alerts-list', alerts.slice(0, 5));

    // Watchlist
    renderWatchlist();
}

function renderAlertsList(containerId, alertsToShow) {
    const container = document.getElementById(containerId);

    if (alertsToShow.length === 0) {
        container.innerHTML = `
            <div class="dca-placeholder" style="height: auto; padding: 40px;">
                No active alerts. Market is calm.
            </div>
        `;
        return;
    }

    container.innerHTML = alertsToShow.map(a => `
        <div class="alert-item ${a.type}">
            <span class="alert-icon">${a.type === 'surge' ? '📈' : a.type === 'drop' ? '📉' : '📊'}</span>
            <div class="alert-content">
                <div class="alert-message">${a.message}</div>
                <div class="alert-time">${formatTime(a.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

function renderWatchlist() {
    const watchlistTokens = marketData.filter(t =>
        watchlist.includes(t.symbol.toUpperCase())
    );

    const container = document.getElementById('watchlist-grid');
    container.innerHTML = watchlistTokens.map(t => `
        <div class="watchlist-item">
            <div class="watchlist-symbol">${t.symbol}</div>
            <div class="watchlist-price">${formatPrice(t.priceUsd)}</div>
            <div class="watchlist-change ${t.priceChange24h >= 0 ? 'change-positive' : 'change-negative'}">
                ${t.priceChange24h >= 0 ? '+' : ''}${t.priceChange24h.toFixed(2)}%
            </div>
        </div>
    `).join('');
}

function renderMarketsTable() {
    const tableBody = document.querySelector('#markets-table tbody');
    const sorted = [...marketData].sort((a, b) => b.volume24h - a.volume24h);

    tableBody.innerHTML = sorted.map((t, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>
                <div class="token-cell">
                    <div class="token-logo">${t.symbol.charAt(0)}</div>
                    <div>
                        <strong>${t.symbol}</strong>
                        <div style="color: var(--text-muted); font-size: 12px;">${t.name || ''}</div>
                    </div>
                </div>
            </td>
            <td>${formatPrice(t.priceUsd)}</td>
            <td>${formatChange(t.priceChange24h)}</td>
            <td>${formatNumber(t.volume24h)}</td>
            <td>${t.marketCap ? formatNumber(t.marketCap) : '--'}</td>
            <td>${t.verified ? '<span class="verified-badge">✓ Verified</span>' : '<span style="color: var(--text-muted)">Unknown</span>'}</td>
        </tr>
    `).join('');
}

function renderWatchlistManage() {
    const watchlistTokens = marketData.filter(t =>
        watchlist.includes(t.symbol.toUpperCase())
    );

    const container = document.getElementById('watchlist-manage');
    container.innerHTML = watchlistTokens.map(t => `
        <div class="watchlist-manage-item">
            <div class="watchlist-token-info">
                <div class="token-logo">${t.symbol.charAt(0)}</div>
                <div class="watchlist-token-details">
                    <h3>${t.symbol}</h3>
                    <span>${formatPrice(t.priceUsd)} · ${formatChange(t.priceChange24h)}</span>
                </div>
            </div>
            <button class="remove-btn" data-symbol="${t.symbol}">✕</button>
        </div>
    `).join('');

    // Attach remove handlers
    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const symbol = btn.dataset.symbol;
            removeFromWatchlist(symbol);
        });
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============ VIEWS ============

function switchView(viewId) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewId);
    });

    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('active', view.id === `${viewId}-view`);
    });

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        markets: 'Markets',
        alerts: 'Alerts',
        dca: 'DCA Planner',
        watchlist: 'Watchlist',
        daydreams: 'Daydreams'
    };
    document.getElementById('page-title').textContent = titles[viewId] || 'Dashboard';

    // Render view-specific content
    if (viewId === 'markets') renderMarketsTable();
    if (viewId === 'alerts') renderAlertsList('alerts-full-list', alerts);
    if (viewId === 'watchlist') renderWatchlistManage();
    if (viewId === 'daydreams') loadDreamsData();
}

// ============ WATCHLIST MANAGEMENT ============

function addToWatchlist(symbol) {
    symbol = symbol.toUpperCase();
    if (!watchlist.includes(symbol)) {
        watchlist.push(symbol);
        saveWatchlist();
        showToast(`Added ${symbol} to watchlist`, 'success');
        renderWatchlist();
        renderWatchlistManage();
    }
}

function removeFromWatchlist(symbol) {
    symbol = symbol.toUpperCase();
    watchlist = watchlist.filter(s => s !== symbol);
    saveWatchlist();
    showToast(`Removed ${symbol} from watchlist`, 'success');
    renderWatchlist();
    renderWatchlistManage();
}

function saveWatchlist() {
    localStorage.setItem('smaira_watchlist', JSON.stringify(watchlist));
}

// ============ DCA ANALYSIS ============

async function analyzeDCA(sellToken, buyToken, totalAmount, frequency) {
    const resultsContainer = document.getElementById('dca-results');
    resultsContainer.innerHTML = '<div class="dca-placeholder"><div class="spinner"></div> Analyzing...</div>';

    const frequencyMap = {
        hourly: { cycles: 720, label: 'hourly' },
        daily: { cycles: 30, label: 'daily' },
        weekly: { cycles: 12, label: 'weekly' },
        monthly: { cycles: 3, label: 'monthly' }
    };

    const freq = frequencyMap[frequency];
    const amountPerCycle = totalAmount / freq.cycles;

    // Get current quote for estimation
    const sellTokenInfo = TOKEN_INFO[sellToken];
    const buyTokenInfo = TOKEN_INFO[buyToken];

    if (!sellTokenInfo || !buyTokenInfo) {
        resultsContainer.innerHTML = '<div class="dca-placeholder">Unknown token</div>';
        return;
    }

    const quote = await fetchQuote(
        sellTokenInfo.address,
        buyTokenInfo.address,
        (amountPerCycle * Math.pow(10, sellTokenInfo.decimals)).toString()
    );

    let estimatedBuy = '--';
    let currentPrice = '--';
    let gasCost = 0.05;

    if (quote) {
        const buyAmount = parseInt(quote.buyAmount) / Math.pow(10, buyTokenInfo.decimals);
        estimatedBuy = (buyAmount * freq.cycles).toFixed(4);
        currentPrice = (amountPerCycle / buyAmount).toFixed(6);
        gasCost = quote.gasFees?.usd || 0.05;
    }

    const totalGas = (gasCost * freq.cycles).toFixed(2);

    resultsContainer.innerHTML = `
        <div class="dca-result-grid">
            <div class="dca-result-item">
                <div class="dca-result-label">Amount per ${frequency.slice(0, -2)}</div>
                <div class="dca-result-value">${amountPerCycle.toFixed(2)} ${sellToken}</div>
            </div>
            <div class="dca-result-item">
                <div class="dca-result-label">Number of cycles</div>
                <div class="dca-result-value">${freq.cycles}</div>
            </div>
            <div class="dca-result-item">
                <div class="dca-result-label">Estimated total buy</div>
                <div class="dca-result-value">${estimatedBuy} ${buyToken}</div>
            </div>
            <div class="dca-result-item">
                <div class="dca-result-label">Current price</div>
                <div class="dca-result-value">$${currentPrice}</div>
            </div>
            <div class="dca-result-item">
                <div class="dca-result-label">Est. gas cost</div>
                <div class="dca-result-value">$${totalGas}</div>
            </div>
            <div class="dca-result-item">
                <div class="dca-result-label">Duration</div>
                <div class="dca-result-value">${frequency === 'hourly' ? '30 days' : frequency === 'daily' ? '30 days' : frequency === 'weekly' ? '12 weeks' : '3 months'}</div>
            </div>
        </div>
        <div class="dca-recommendation">
            <h4>💡 Recommendation</h4>
            <p>${getRecommendation(frequency, amountPerCycle, gasCost)}</p>
        </div>
    `;
}

function getRecommendation(frequency, amount, gas) {
    if (frequency === 'hourly' && gas > 0.02) {
        return 'High frequency DCA may incur significant gas costs. Consider daily or weekly for better cost efficiency.';
    }
    if (amount < 5) {
        return 'Low amount per cycle. Gas costs may be disproportionate. Consider increasing total amount or reducing frequency.';
    }
    return `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} DCA looks reasonable. Average price will smooth out volatility over time.`;
}

// ============ TOAST NOTIFICATIONS ============

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : '✕'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ REPORT GENERATION ============

function generateReport() {
    const topByVolume = [...marketData]
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, 10);

    const gainers = [...marketData]
        .filter(t => t.priceChange24h > 0)
        .sort((a, b) => b.priceChange24h - a.priceChange24h)
        .slice(0, 5);

    const losers = [...marketData]
        .filter(t => t.priceChange24h < 0)
        .sort((a, b) => a.priceChange24h - b.priceChange24h)
        .slice(0, 5);

    const totalVolume = marketData.reduce((sum, t) => sum + t.volume24h, 0);

    let report = `# 📊 Smaira Market Report\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Tokens**: ${marketData.length}\n`;
    report += `**24h Volume**: ${formatNumber(totalVolume)}\n\n`;

    report += `## 🏆 Top 10 by Volume\n\n`;
    report += `| Token | Price | Volume | Change |\n`;
    report += `|-------|-------|--------|--------|\n`;
    topByVolume.forEach(t => {
        const change = t.priceChange24h >= 0 ? `+${t.priceChange24h.toFixed(2)}%` : `${t.priceChange24h.toFixed(2)}%`;
        report += `| ${t.symbol} | ${formatPrice(t.priceUsd)} | ${formatNumber(t.volume24h)} | ${change} |\n`;
    });

    report += `\n## 📈 Top Gainers\n\n`;
    gainers.forEach(t => {
        report += `- **${t.symbol}**: +${t.priceChange24h.toFixed(2)}%\n`;
    });

    report += `\n## 📉 Top Losers\n\n`;
    losers.forEach(t => {
        report += `- **${t.symbol}**: ${t.priceChange24h.toFixed(2)}%\n`;
    });

    report += `\n---\n*Generated by Smaira Cron Rep*`;

    // Download report
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smaira-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Report downloaded!', 'success');
}

// ============ DAYDREAMS ============

// $DREAMS token address on Base
const DREAMS_BASE_ADDRESS = '0x176383016BB310C9f1C180DC6729d5E28104e602';

let dreamsData = null;

async function loadDreamsData() {
    try {
        // Fetch $DREAMS price from DexScreener
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${DREAMS_BASE_ADDRESS}`);
        if (!response.ok) throw new Error('DexScreener error');

        const data = await response.json();
        const pairs = data.pairs || [];

        if (pairs.length > 0) {
            const mainPair = pairs[0];
            dreamsData = {
                price: parseFloat(mainPair.priceUsd) || 0,
                change24h: mainPair.priceChange?.h24 || 0,
                volume24h: mainPair.volume?.h24 || 0,
                liquidity: mainPair.liquidity?.usd || 0,
            };

            // Update UI
            const priceEl = document.getElementById('dreams-price');
            const changeEl = document.getElementById('dreams-change');
            const volumeEl = document.getElementById('dreams-volume');

            if (priceEl) priceEl.textContent = `$${dreamsData.price.toFixed(6)}`;
            if (changeEl) {
                changeEl.textContent = `${dreamsData.change24h >= 0 ? '+' : ''}${dreamsData.change24h.toFixed(2)}%`;
                changeEl.className = `stat-value ${dreamsData.change24h >= 0 ? 'positive' : 'negative'}`;
            }
            if (volumeEl) volumeEl.textContent = formatNumber(dreamsData.volume24h);
        }
    } catch (error) {
        console.error('Failed to fetch $DREAMS data:', error);
    }
}

// ============ MAIN ============

async function loadData() {
    document.getElementById('last-updated').textContent = 'Updating...';

    const raw = await fetchMarketData();
    marketData = processMarketData(raw);
    alerts = processAlerts(marketData);
    lastUpdate = new Date();

    document.getElementById('last-updated').textContent = `Last updated: ${formatTime(lastUpdate)}`;

    renderDashboard();
}

function init() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.view);
        });
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', loadData);

    // Report button
    document.getElementById('report-btn').addEventListener('click', generateReport);

    // Market search
    document.getElementById('market-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#markets-table tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    });

    // Alert config
    document.getElementById('check-alerts-btn').addEventListener('click', () => {
        alertConfig.priceChangeThreshold = parseFloat(document.getElementById('price-threshold').value);
        alertConfig.volumeSpikeThreshold = parseFloat(document.getElementById('volume-threshold').value);
        localStorage.setItem('smaira_price_threshold', alertConfig.priceChangeThreshold);
        localStorage.setItem('smaira_volume_threshold', alertConfig.volumeSpikeThreshold);
        alerts = processAlerts(marketData);
        renderAlertsList('alerts-full-list', alerts);
        showToast(`Found ${alerts.length} alerts`, 'success');
    });

    // DCA form
    document.getElementById('dca-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const sellToken = document.getElementById('dca-sell-token').value;
        const buyToken = document.getElementById('dca-buy-token').value;
        const amount = parseFloat(document.getElementById('dca-amount').value);
        const frequency = document.getElementById('dca-frequency').value;
        analyzeDCA(sellToken, buyToken, amount, frequency);
    });

    document.getElementById('dca-sell-token').addEventListener('change', (e) => {
        document.getElementById('dca-amount-suffix').textContent = e.target.value;
    });

    // Watchlist add
    document.getElementById('add-token-btn').addEventListener('click', () => {
        const input = document.getElementById('add-token');
        const symbol = input.value.trim();
        if (symbol) {
            addToWatchlist(symbol);
            input.value = '';
        }
    });

    document.getElementById('add-token').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('add-token-btn').click();
        }
    });

    // Initial load
    loadData();

    // Auto-refresh
    setInterval(loadData, REFRESH_INTERVAL);
}

// Start
document.addEventListener('DOMContentLoaded', init);
