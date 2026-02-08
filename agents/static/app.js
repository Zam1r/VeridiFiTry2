// Application State
const state = {
    currentTab: 'market-analysis',
    selectedCompany: null,
    currentLeaderboard: 'top-performers',
    currentTradingTab: 'invest',
    currentContractType: null,
    user: {
        credits: 0,
        balance: 10000,
        holdings: [],
        contracts: [],
        incomeHistory: []
    },
    companies: [],
    marketData: {
        totalCredits: 0,
        globalCO2: 420,
        activeCompanies: 0,
        marketCap: 0
    },
    plasmaTerminalInterval: null,
    displayedMintIds: new Set(), // Track which mint events have been displayed
    isInitialMintLoad: true // Track if this is the first load
};

// API Base URL - Now integrated with Flask server
const API_BASE = '/api';

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');
    
    // Check if user needs to see tutorial FIRST
    checkAuthAndTutorial();
    
    // Only initialize app features if tutorial is not showing
    const urlParams = new URLSearchParams(window.location.search);
    const showTutorial = urlParams.get('tutorial') === 'true';
    const tutorialShown = localStorage.getItem('tutorialShown') === 'true';
    
    if (!showTutorial || tutorialShown) {
        // Initialize app features only if tutorial won't be shown
        initializeNavigation();
        initializeTabs();
        initializeMenu();
        loadInitialData();
        setupEventListeners();
        initializeAutoReload();
        // Developer panel is now part of Green Treasury, initialize when that tab loads
        // Initialize it when Market Analysis loads (or when Green Treasury is selected)
        if (state.currentTab === 'developer-green-treasury') {
            initializeDeveloperPanel();
        }
        console.log('Application initialized');
    } else {
        console.log('Tutorial will be shown, app initialization deferred');
    }
});

// Auto-reload functionality (only in development)
function initializeAutoReload() {
    // Only enable in development (when running on localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setInterval(async () => {
            try {
                const response = await fetch('/api/reload-check');
                const data = await response.json();
                if (data.reload) {
                    console.log('Files changed, reloading...', data.changes);
                    window.location.reload();
                }
            } catch (error) {
                // Silently fail if endpoint doesn't exist or server is down
            }
        }, 2000); // Check every 2 seconds
    }
}

// Navigation
function initializeNavigation() {
    // Wait for DOM to be fully ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNavigation);
        return;
    }
    
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (navLinks.length === 0) {
        console.warn('No navigation links found, retrying...');
        setTimeout(initializeNavigation, 200);
        return;
    }
    
    console.log(`Initializing ${navLinks.length} navigation links`);
    
    navLinks.forEach((link, index) => {
        // Ensure button type is set
        if (link.tagName === 'BUTTON') {
            link.type = 'button';
        }
        
        // Get the tab name
        const tabName = link.getAttribute('data-tab');
        console.log(`Nav link ${index}: ${tabName}`);
        
        // Remove any existing listeners by using a named function we can remove
        const clickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tab = this.getAttribute('data-tab');
            console.log('Nav clicked:', tab);
            
            if (tab) {
                switchTab(tab);
            }
        };
        
        // Remove old listener if exists, then add new one
        link.removeEventListener('click', clickHandler);
        link.addEventListener('click', clickHandler);
    });
    
    console.log('Navigation initialized successfully');
}

function switchTab(tabName) {
    if (!tabName) {
        console.error('switchTab: No tab name provided');
        return;
    }

    console.log('switchTab: Switching to', tabName);

    // Stop treasury polling if switching away
    if (state.currentTab === 'developer-green-treasury' && tabName !== 'developer-green-treasury') {
        if (treasuryUpdateInterval) {
            clearInterval(treasuryUpdateInterval);
            treasuryUpdateInterval = null;
        }
        stopAgentLogsPolling();
    }
    
    // Stop plasma terminal polling if switching away from portfolio
    if (state.currentTab === 'portfolio' && tabName !== 'portfolio') {
        if (state.plasmaTerminalInterval) {
            clearInterval(state.plasmaTerminalInterval);
            state.plasmaTerminalInterval = null;
        }
    }

    // Update nav links (excluding developer button)
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.id === 'developer-toggle') return;
        const linkTab = link.getAttribute('data-tab');
        link.classList.remove('active');
        if (linkTab === tabName) {
            link.classList.add('active');
        }
    });

    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(tabName);
    if (!targetSection) {
        console.error(`switchTab: Section "${tabName}" not found in DOM`);
        const available = Array.from(document.querySelectorAll('.tab-content')).map(t => t.id);
        console.log('Available sections:', available);
        return;
    }
    
    // Add active class to show the section
    targetSection.classList.add('active');
    state.currentTab = tabName;
    
    // Force a reflow to ensure CSS updates
    void targetSection.offsetHeight;
    
    console.log('switchTab: Successfully switched to', tabName);

    // Smooth scroll to the section
    requestAnimationFrame(() => {
        const navbar = document.querySelector('.navbar');
        if (navbar && targetSection) {
            const navbarHeight = navbar.offsetHeight || 56;
            const sectionTop = targetSection.offsetTop - navbarHeight - 10;
            window.scrollTo({
                top: Math.max(0, sectionTop),
                behavior: 'smooth'
            });
        }
    });

    // Load tab-specific data
    try {
        if (tabName === 'developer-green-treasury') {
            loadGreenTreasury();
            initializeDeveloperPanel();
        } else if (tabName === 'market-analysis') {
            loadMarketAnalysis();
        } else if (tabName === 'leaderboards') {
            loadLeaderboards();
        } else if (tabName === 'market') {
            loadMarket();
        } else if (tabName === 'portfolio') {
            loadPortfolio();
        } else if (tabName === 'scanning') {
            loadScanning();
        }
    } catch (error) {
        console.error('Error loading tab data:', error);
    }
}

// Initialize Tab-Specific Features
function initializeTabs() {
    // Leaderboard tabs
    const leaderboardTabs = document.querySelectorAll('.leaderboard-tab');
    leaderboardTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const leaderboard = e.target.dataset.leaderboard;
            switchLeaderboard(leaderboard);
        });
    });

    // Trading tabs
    const tradingTabs = document.querySelectorAll('.trading-tab');
    tradingTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tradingTab = e.target.dataset.trading;
            switchTradingTab(tradingTab);
        });
    });
}

function switchLeaderboard(leaderboardName) {
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.leaderboard-section').forEach(section => {
        section.classList.remove('active');
    });

    document.querySelector(`[data-leaderboard="${leaderboardName}"]`).classList.add('active');
    document.getElementById(leaderboardName).classList.add('active');

    state.currentLeaderboard = leaderboardName;
    loadLeaderboardData(leaderboardName);
}

function switchTradingTab(tabName) {
    document.querySelectorAll('.trading-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.trading-content').forEach(content => {
        content.classList.remove('active');
    });

    document.querySelector(`[data-trading="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-panel`).classList.add('active');

    state.currentTradingTab = tabName;
}

// Event Listeners
function setupEventListeners() {
    // Company search
    const companySearch = document.getElementById('company-search');
    if (companySearch) {
        companySearch.addEventListener('input', (e) => {
            filterCompanies(e.target.value);
        });
    }

    // Investment form
    const investBtn = document.getElementById('invest-btn');
    if (investBtn) {
        investBtn.addEventListener('click', handleInvestment);
    }

    const investmentAmount = document.getElementById('investment-amount');
    if (investmentAmount) {
        investmentAmount.addEventListener('input', updateExpectedShare);
    }

    // Contract type buttons
    const contractTypeBtns = document.querySelectorAll('.contract-type-btn');
    contractTypeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            contractTypeBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.currentContractType = e.target.dataset.contract;
            updateContractForm();
        });
    });

    // Create contract button
    const createContractBtn = document.getElementById('create-contract-btn');
    if (createContractBtn) {
        createContractBtn.addEventListener('click', handleCreateContract);
    }
}

// Load Initial Data
async function loadInitialData() {
    try {
        // Load companies
        const companiesRes = await fetch(`${API_BASE}/companies`);
        state.companies = await companiesRes.json();

        // Load user data
        const userRes = await fetch(`${API_BASE}/user`);
        const userData = await userRes.json();
        state.user = { ...state.user, ...userData };

        // Load market data
        const marketRes = await fetch(`${API_BASE}/market`);
        state.marketData = await marketRes.json();

        // Add mock portfolio data if holdings are empty
        if (state.user.holdings.length === 0) {
            initializeMockPortfolio();
        }

        updateUserDisplay();
        // Load Market Analysis as default tab
        if (state.currentTab === 'market-analysis') {
            loadMarketAnalysis();
        } else if (state.currentTab === 'developer-green-treasury') {
            loadGreenTreasury();
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
        // Use mock data if API fails
        loadMockData();
        // Still load Market Analysis if it's the default tab
        if (state.currentTab === 'market-analysis') {
            loadMarketAnalysis();
        } else if (state.currentTab === 'developer-green-treasury') {
            loadGreenTreasury();
        }
    }
}

function loadMockData() {
    // Mock companies with real names
    const companyNames = [
        'ACME Corporation', 'TechGlobal Industries', 'Green Energy Solutions', 'Manufacturing Co Ltd',
        'Solar Power Systems', 'Wind Energy Group', 'EcoTech Innovations', 'Sustainable Materials Inc',
        'Carbon Neutral Corp', 'Renewable Resources Ltd', 'Clean Transport Solutions', 'AgriTech Ventures',
        'Ocean Cleanup Initiative', 'Forest Restoration Co', 'Hydrogen Energy Systems', 'Battery Storage Solutions',
        'Smart Grid Technologies', 'Waste Management Plus', 'Water Conservation Systems', 'Biofuel Industries'
    ];
    state.companies = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: companyNames[i] || `Company ${String.fromCharCode(65 + i)}`,
        credits: Math.floor(Math.random() * 10000),
        debt: Math.random() > 0.7 ? Math.floor(Math.random() * 5000) : 0,
        industry: ['Tech', 'Manufacturing', 'Energy', 'Transport', 'Agriculture'][Math.floor(Math.random() * 5)],
        totalInvestment: Math.floor(Math.random() * 1000000),
        previousCredits: Math.floor(Math.random() * 5000),
        co2Reduction: (Math.random() * 20).toFixed(2),
        sharePrice: (Math.random() * 100 + 10).toFixed(2)
    }));

    // Mock market data
    state.marketData = {
        totalCredits: state.companies.reduce((sum, c) => sum + c.credits, 0),
        globalCO2: 420 + Math.random() * 10,
        activeCompanies: state.companies.length,
        marketCap: state.companies.reduce((sum, c) => sum + c.totalInvestment, 0)
    };

    // Add mock portfolio data if holdings are empty
    if (state.user.holdings.length === 0) {
        initializeMockPortfolio();
    }

    updateUserDisplay();
    loadMarketAnalysis();
}

function initializeMockPortfolio() {
    // Use actual companies if available, otherwise use fallback company IDs
    let companiesToUse = [];
    
    if (state.companies && state.companies.length > 0) {
        // Use first 4 companies from the loaded companies
        companiesToUse = state.companies.slice(0, 4).map(c => ({
            id: c.id || c.companyId || `company-${c.name?.toLowerCase().replace(/\s+/g, '-')}`,
            name: c.name || `Company ${c.id}`
        }));
    }
    
    // Fallback to known company IDs from companies.js
    if (companiesToUse.length === 0) {
        companiesToUse = [
            { id: 'acme-corp', name: 'ACME Corporation' },
            { id: 'tech-global', name: 'TechGlobal Industries' },
            { id: 'green-energy', name: 'Green Energy Solutions' },
            { id: 'manufacturing-co', name: 'Manufacturing Co Ltd' }
        ];
    }
    
    // Create holdings with varying investment amounts and shares
    const investmentAmounts = [50000, 35000, 75000, 42000];
    const shares = [5.2, 3.8, 8.5, 4.1];
    const credits = [1250, 890, 2100, 980];
    
    state.user.holdings = companiesToUse.slice(0, 4).map((company, index) => ({
        companyId: company.id,
        companyName: company.name,
        amount: investmentAmounts[index] || Math.floor(Math.random() * 50000 + 20000),
        share: shares[index] || (Math.random() * 5 + 2).toFixed(1),
        credits: credits[index] || Math.floor(Math.random() * 2000 + 500)
    }));

    // Mock income history - last 30 days
    const today = new Date();
    state.user.incomeHistory = [];
    
    // Add some income entries over the past month
    for (let i = 0; i < 15; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (29 - i * 2)); // Spread over 30 days
        
        const sources = [
            'Carbon Credit Dividend - ACME Corp',
            'Carbon Credit Dividend - TechGlobal',
            'Carbon Credit Dividend - Green Energy',
            'Trading Profit - Market Position',
            'Verification Reward - FDC Consensus',
            'Plasma Payout - Settlement',
            'Investment Return - Manufacturing Co'
        ];
        
        const amount = Math.random() * 500 + 100; // Between $100 and $600
        
        state.user.incomeHistory.push({
            source: sources[Math.floor(Math.random() * sources.length)],
            date: date.toISOString(),
            amount: Math.round(amount * 100) / 100 // Round to 2 decimals
        });
    }
    
    // Sort by date (newest first)
    state.user.incomeHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Update user credits based on holdings
    state.user.credits = state.user.holdings.reduce((sum, h) => sum + (h.credits || 0), 0);
}

// Market Analysis Tab
function loadMarketAnalysis() {
    updateMarketStats();
    renderCO2TrendChart();
    renderCreditsDistributionChart();
    loadMintEvents();
    loadNews();
    
    // Set up polling for mint events
    if (window.mintPollInterval) {
        clearInterval(window.mintPollInterval);
    }
    window.mintPollInterval = setInterval(loadMintEvents, 5000); // Poll every 5 seconds
}

async function updateMarketStats() {
    const totalCredits = state.companies.reduce((sum, c) => sum + c.credits, 0);
    const marketCap = state.companies.reduce((sum, c) => sum + c.totalInvestment, 0);

    // Fetch total in circulation from mint events
    try {
        const response = await fetch('/api/carbon-credits/mints');
        const data = await response.json();
        if (data.success && data.total_in_circulation) {
            // Use minted credits as the source of truth for total in circulation
            document.getElementById('total-credits').textContent = data.total_in_circulation.toLocaleString();
        } else {
            document.getElementById('total-credits').textContent = totalCredits.toLocaleString();
        }
    } catch (error) {
        // Fallback to company credits if API fails
        document.getElementById('total-credits').textContent = totalCredits.toLocaleString();
    }

    document.getElementById('global-co2').textContent = state.marketData.globalCO2.toFixed(2) + ' ppm';
    document.getElementById('active-companies').textContent = state.companies.length;
    document.getElementById('market-cap').textContent = '$' + marketCap.toLocaleString();
}

function renderCO2TrendChart() {
    const ctx = document.getElementById('co2-trend-chart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (ctx.chart) {
        ctx.chart.destroy();
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const baseCO2 = 420;
    const data = months.map(() => baseCO2 + (Math.random() * 10 - 5));

    // Set fixed height for canvas
    const container = ctx.closest('.chart-container');
    if (container) {
        ctx.style.width = '100%';
        ctx.style.height = '100%';
        ctx.style.maxHeight = '320px';
    }

    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'CO₂ Level (ppm)',
                data: data,
                borderColor: '#00d4aa',
                backgroundColor: 'rgba(0, 212, 170, 0.08)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#00d4aa',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#161b22',
                    borderColor: '#30363d',
                    borderWidth: 1,
                    titleColor: '#e6edf3',
                    bodyColor: '#8b949e',
                    padding: 12,
                    titleFont: {
                        size: 12,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13,
                        family: "'SF Mono', monospace"
                    },
                    displayColors: false,
                    cornerRadius: 6
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: '#21262d',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#8b949e',
                        font: {
                            size: 11,
                            family: "'SF Mono', monospace"
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#8b949e',
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function renderCreditsDistributionChart() {
    const ctx = document.getElementById('credits-distribution-chart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (ctx.chart) {
        ctx.chart.destroy();
    }

    const industries = ['Tech', 'Manufacturing', 'Energy', 'Transport', 'Agriculture'];
    const data = industries.map(industry => {
        return state.companies
            .filter(c => c.industry === industry)
            .reduce((sum, c) => sum + c.credits, 0);
    });

    // Set fixed dimensions for canvas to maintain aspect ratio
    const container = ctx.closest('.chart-container');
    if (container) {
        // Set a square aspect ratio to prevent stretching
        const containerWidth = container.offsetWidth;
        const maxSize = Math.min(containerWidth - 40, 300); // Account for padding
        ctx.style.width = maxSize + 'px';
        ctx.style.height = maxSize + 'px';
        ctx.style.maxWidth = '100%';
        ctx.style.maxHeight = '100%';
        ctx.style.margin = '0 auto';
    }

    ctx.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: industries,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#00d4aa',
                    '#0984e3',
                    '#3fb950',
                    '#d29922',
                    '#6c5ce7'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#8b949e',
                        font: {
                            size: 11
                        },
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: '#161b22',
                    borderColor: '#30363d',
                    borderWidth: 1,
                    titleColor: '#e6edf3',
                    bodyColor: '#8b949e',
                    padding: 12,
                    titleFont: {
                        size: 12,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13,
                        family: "'SF Mono', monospace"
                    },
                    cornerRadius: 6
                }
            }
        }
    });
}

function loadNews() {
    const newsList = document.getElementById('news-list');
    if (!newsList) return;

    const news = [
        {
            title: 'Global Carbon Credit Market Reaches New High',
            content: 'The carbon credit market has seen unprecedented growth this quarter, with total credits in circulation increasing by 15%.',
            date: new Date().toLocaleDateString()
        },
        {
            title: 'Tech Companies Lead in Carbon Reduction',
            content: 'Major technology companies have collectively reduced CO₂ emissions by 25% compared to last year.',
            date: new Date(Date.now() - 86400000).toLocaleDateString()
        },
        {
            title: 'New Regulations Boost Carbon Credit Trading',
            content: 'Recent government regulations have created new opportunities for companies to earn carbon credits through innovative sustainability practices.',
            date: new Date(Date.now() - 172800000).toLocaleDateString()
        }
    ];

    newsList.innerHTML = news.map(item => `
        <div class="news-item">
            <h4>${item.title}</h4>
            <p>${item.content}</p>
            <span class="news-date">${item.date}</span>
        </div>
    `).join('');
}

// Load and display carbon credit mint events
async function loadMintEvents() {
    const mintTerminalContent = document.getElementById('mint-terminal-content');
    const totalInCirculation = document.getElementById('total-in-circulation');
    const totalMinted = document.getElementById('total-minted');
    
    if (!mintTerminalContent) return;

    try {
        const response = await fetch('/api/carbon-credits/mints');
        const data = await response.json();
        
        if (data.success) {
            const mints = data.mints || [];
            const totalCirculation = data.total_in_circulation || 0;
            const totalMintedAmount = data.total_minted || 0;
            
            // Update totals
            if (totalInCirculation) {
                totalInCirculation.textContent = totalCirculation.toLocaleString() + ' CC';
            }
            if (totalMinted) {
                totalMinted.textContent = totalMintedAmount.toLocaleString() + ' CC';
            }
            
            // Update total credits in market stats
            updateMarketStats();
            
            // Handle initial load or empty state
            if (mints.length === 0) {
                if (state.isInitialMintLoad) {
                    mintTerminalContent.innerHTML = `
                        <div class="terminal-log terminal-log-system">
                            <span class="log-timestamp">[--:--:--]</span>
                            <span class="log-icon">ℹ️</span>
                            <span class="log-message">No mint events yet. Waiting for Plasma to mint carbon credits...</span>
                        </div>
                    `;
                    state.isInitialMintLoad = false;
                }
                return;
            }
            
            // Sort mints by timestamp (newest first) for display
            const sortedMints = [...mints].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            // On initial load, display all mints (up to 50)
            if (state.isInitialMintLoad) {
                const recentMints = sortedMints.slice(0, 50);
                mintTerminalContent.innerHTML = recentMints.map(mint => {
                    const mintId = mint.id || mint.tx_hash || `${mint.timestamp}_${mint.amount}`;
                    state.displayedMintIds.add(mintId);
                    return createMintLogEntry(mint);
                }).join('');
                
                state.isInitialMintLoad = false;
                // Auto-scroll to bottom
                mintTerminalContent.scrollTop = mintTerminalContent.scrollHeight;
                return;
            }
            
            // For subsequent loads, only add new mints
            const newMints = sortedMints.filter(mint => {
                const mintId = mint.id || mint.tx_hash || `${mint.timestamp}_${mint.amount}`;
                return !state.displayedMintIds.has(mintId);
            });
            
            if (newMints.length > 0) {
                // Remove placeholder message if it exists
                const placeholder = mintTerminalContent.querySelector('.terminal-log-system');
                if (placeholder && placeholder.textContent.includes('No mint events yet')) {
                    placeholder.remove();
                }
                
                // Add new mint log entries
                newMints.forEach(mint => {
                    const mintId = mint.id || mint.tx_hash || `${mint.timestamp}_${mint.amount}`;
                    state.displayedMintIds.add(mintId);
                    
                    const logEntry = document.createElement('div');
                    logEntry.className = 'terminal-log terminal-log-success';
                    logEntry.innerHTML = createMintLogEntry(mint);
                    mintTerminalContent.appendChild(logEntry);
                });
                
                // Keep only the last 50 entries for performance
                const allLogs = mintTerminalContent.querySelectorAll('.terminal-log');
                if (allLogs.length > 50) {
                    const logsToRemove = allLogs.length - 50;
                    for (let i = 0; i < logsToRemove; i++) {
                        allLogs[i].remove();
                    }
                }
                
                // Auto-scroll to bottom
                mintTerminalContent.scrollTop = mintTerminalContent.scrollHeight;
            }
        } else {
            console.error('Failed to load mint events:', data.error);
            // Only show error on initial load or if terminal is empty
            if (state.isInitialMintLoad || mintTerminalContent.children.length === 0) {
                mintTerminalContent.innerHTML = `
                    <div class="terminal-log terminal-log-error">
                        <span class="log-timestamp">[--:--:--]</span>
                        <span class="log-icon">❌</span>
                        <span class="log-message">Error loading mint events: ${data.error || 'Unknown error'}</span>
                    </div>
                `;
                state.isInitialMintLoad = false;
            }
        }
    } catch (error) {
        console.error('Error loading mint events:', error);
        // Only show error on initial load or if terminal is empty
        if (state.isInitialMintLoad || mintTerminalContent.children.length === 0) {
            mintTerminalContent.innerHTML = `
                <div class="terminal-log terminal-log-error">
                    <span class="log-timestamp">[--:--:--]</span>
                    <span class="log-icon">❌</span>
                    <span class="log-message">Error loading mint events. Please try again later.</span>
                </div>
            `;
            state.isInitialMintLoad = false;
        }
    }
}

function createMintLogEntry(mint) {
    const timestamp = formatMintTimestampForTerminal(mint.timestamp);
    const txHash = mint.tx_hash ? (mint.tx_hash.substring(0, 10) + '...' + mint.tx_hash.substring(mint.tx_hash.length - 8)) : 'Pending';
    const explorerUrl = mint.explorer_url || '#';
    const network = mint.network || 'Plasma';
    const reason = mint.reason || 'Carbon Credit Minted';
    
    return `
        <span class="log-timestamp">[${timestamp}]</span>
        <span class="log-message">
            <strong>Carbon Credit Minted</strong> - <span style="color: #51cf66;">+${mint.amount.toLocaleString()} CC</span> | 
            Blockchain: <span style="color: #74b9ff;">${network}</span> | 
            TX: <a href="${explorerUrl}" target="_blank" style="color: #74b9ff; text-decoration: none;">${txHash}</a> | 
            Reason: ${reason}
        </span>
    `;
}

function formatMintTimestampForTerminal(timestamp) {
    if (!timestamp) return '--:--:--';
    const date = new Date(timestamp * 1000);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function formatMintTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleString();
    }
}

// Leaderboards Tab
function loadLeaderboards() {
    loadLeaderboardData(state.currentLeaderboard);
}

function loadLeaderboardData(type) {
    let companies = [...state.companies];
    let listId = '';

    switch (type) {
        case 'top-performers':
            companies.sort((a, b) => b.credits - a.credits);
            listId = 'top-performers-list';
            break;
        case 'worst-performers':
            companies = companies.filter(c => c.debt > 0);
            companies.sort((a, b) => b.debt - a.debt);
            listId = 'worst-performers-list';
            break;
        case 'best-comparative':
            const avgCredits = companies.reduce((sum, c) => sum + c.credits, 0) / companies.length;
            companies.forEach(c => {
                c.comparative = c.credits - avgCredits;
            });
            companies.sort((a, b) => b.comparative - a.comparative);
            listId = 'best-comparative-list';
            break;
        case 'turnarounds':
            companies.forEach(c => {
                c.turnaround = c.credits - c.previousCredits;
            });
            companies.sort((a, b) => b.turnaround - a.turnaround);
            listId = 'turnarounds-list';
            break;
        case 'growth':
            companies.forEach(c => {
                c.growthRate = c.previousCredits > 0 
                    ? ((c.credits - c.previousCredits) / c.previousCredits * 100).toFixed(2)
                    : 0;
            });
            companies.sort((a, b) => b.growthRate - a.growthRate);
            listId = 'growth-list';
            break;
    }

    renderLeaderboard(listId, companies, type);
}

function renderLeaderboard(listId, companies, type) {
    const list = document.getElementById(listId);
    if (!list) return;

    let headerLabel = '';
    switch (type) {
        case 'top-performers':
            headerLabel = 'Credits';
            break;
        case 'worst-performers':
            headerLabel = 'Debt';
            break;
        case 'best-comparative':
            headerLabel = 'vs Avg';
            break;
        case 'turnarounds':
            headerLabel = 'Change';
            break;
        case 'growth':
            headerLabel = 'Growth';
            break;
    }

    const header = `
        <div class="leaderboard-row leaderboard-header">
            <span class="rank">#</span>
            <span class="company-name">Company</span>
            <span class="company-metric">Industry</span>
            <span class="metric-value">${headerLabel}</span>
            <span class="company-metric">CO₂ Reduction</span>
        </div>
    `;

    const rows = companies.slice(0, 20).map((company, index) => {
        let metric = '';
        let metricClass = '';

        switch (type) {
            case 'top-performers':
                metric = `${company.credits.toLocaleString()} CC`;
                metricClass = 'negative';
                break;
            case 'worst-performers':
                metric = `$${company.debt.toLocaleString()}`;
                metricClass = 'positive';
                break;
            case 'best-comparative':
                metric = `${company.comparative > 0 ? '+' : ''}${company.comparative.toFixed(0)} CC`;
                metricClass = company.comparative > 0 ? 'negative' : 'positive';
                break;
            case 'turnarounds':
                metric = `${company.turnaround > 0 ? '+' : ''}${company.turnaround.toLocaleString()} CC`;
                metricClass = company.turnaround > 0 ? 'negative' : 'positive';
                break;
            case 'growth':
                metric = `${company.growthRate > 0 ? '+' : ''}${company.growthRate}%`;
                metricClass = company.growthRate > 0 ? 'negative' : 'positive';
                break;
        }

        return `
            <div class="leaderboard-row">
                <span class="rank ${index < 3 ? 'top' : ''}">${index + 1}</span>
                <span class="company-name">${company.name}</span>
                <span class="company-metric">${company.industry}</span>
                <span class="metric-value ${metricClass}">${metric}</span>
                <span class="company-metric">${company.co2Reduction}%</span>
            </div>
        `;
    }).join('');

    list.innerHTML = header + rows;
}

// Market Tab
function loadMarket() {
    renderCompanies();
    populateContractCompanies();
    loadActiveContracts();
    renderCompanyReports();
}

function renderCompanies() {
    const container = document.getElementById('companies-container');
    if (!container) return;

    container.innerHTML = state.companies.map(company => `
        <div class="company-card" data-company-id="${company.id}">
            <div class="company-header">
                <span class="company-name-large">${company.name}</span>
                <span class="company-credits">${company.credits.toLocaleString()} CC</span>
            </div>
            <div class="company-info">
                <span>${company.industry}</span>
                <span>$${company.sharePrice}</span>
            </div>
        </div>
    `).join('');

    // Add click listeners
    container.querySelectorAll('.company-card').forEach(card => {
        card.addEventListener('click', () => {
            const companyId = parseInt(card.dataset.companyId);
            selectCompany(companyId);
        });
    });
}

function selectCompany(companyId) {
    state.selectedCompany = state.companies.find(c => c.id === companyId);
    
    // Update UI
    document.querySelectorAll('.company-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-company-id="${companyId}"]`).classList.add('selected');

    // Show company details
    const selectedCompanyDiv = document.getElementById('selected-company');
    const investmentForm = document.getElementById('investment-form');

    if (state.selectedCompany) {
        selectedCompanyDiv.innerHTML = `
            <h4>${state.selectedCompany.name}</h4>
            <p>Industry: ${state.selectedCompany.industry}</p>
            <p>Carbon Credits: ${state.selectedCompany.credits.toLocaleString()} CC</p>
            <p>Share Price: $${state.selectedCompany.sharePrice}</p>
            <p>CO₂ Reduction: ${state.selectedCompany.co2Reduction}%</p>
        `;
        investmentForm.style.display = 'block';
        updateExpectedShare();
    }
}

function filterCompanies(searchTerm) {
    const cards = document.querySelectorAll('.company-card');
    const term = searchTerm.toLowerCase();

    cards.forEach(card => {
        const companyName = card.querySelector('.company-name-large').textContent.toLowerCase();
        if (companyName.includes(term)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function updateExpectedShare() {
    const amountInput = document.getElementById('investment-amount');
    const shareInput = document.getElementById('expected-share');

    if (!amountInput || !shareInput || !state.selectedCompany) return;

    const amount = parseFloat(amountInput.value) || 0;
    const totalInvestment = state.selectedCompany.totalInvestment;
    const share = totalInvestment > 0 ? (amount / totalInvestment * 100).toFixed(2) : 0;

    shareInput.value = `${share}%`;
}

async function handleInvestment() {
    const amount = parseFloat(document.getElementById('investment-amount').value);
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid investment amount');
        return;
    }

    if (amount > state.user.balance) {
        alert('Insufficient balance');
        return;
    }

    if (!state.selectedCompany) {
        alert('Please select a company');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/invest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyId: state.selectedCompany.id,
                amount: amount
            })
        });

        const result = await response.json();
        
        if (result.success) {
            state.user.balance -= amount;
            state.user.holdings.push({
                companyId: state.selectedCompany.id,
                companyName: state.selectedCompany.name,
                amount: amount,
                share: result.share,
                credits: 0
            });

            updateUserDisplay();
            document.getElementById('investment-amount').value = '';
            alert('Investment successful!');
        }
    } catch (error) {
        console.error('Investment error:', error);
        alert('Investment failed. Please try again.');
    }
}

function populateContractCompanies() {
    const select = document.getElementById('contract-company');
    if (!select) return;

    select.innerHTML = '<option value="">Choose a company...</option>' +
        state.companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function updateContractForm() {
    const expiryGroup = document.getElementById('contract-expiry-group');
    const strikeGroup = document.getElementById('contract-strike-group');
    const typeDisplay = document.getElementById('contract-type-display');

    if (!expiryGroup || !strikeGroup || !typeDisplay) return;

    if (state.currentContractType === 'futures' || state.currentContractType === 'options') {
        expiryGroup.style.display = 'block';
    } else {
        expiryGroup.style.display = 'none';
    }

    if (state.currentContractType === 'options') {
        strikeGroup.style.display = 'block';
    } else {
        strikeGroup.style.display = 'none';
    }

    const typeNames = {
        'long': 'Go Long',
        'short': 'Short',
        'futures': 'Futures',
        'options': 'Options'
    };

    typeDisplay.value = typeNames[state.currentContractType] || '';
}

async function handleCreateContract() {
    const companyId = parseInt(document.getElementById('contract-company').value);
    const amount = parseFloat(document.getElementById('contract-amount').value);
    const expiry = document.getElementById('contract-expiry').value;
    const strike = parseFloat(document.getElementById('contract-strike').value);

    if (!state.currentContractType) {
        alert('Please select a contract type');
        return;
    }

    if (!companyId || !amount) {
        alert('Please fill in all required fields');
        return;
    }

    const company = state.companies.find(c => c.id === companyId);

    const contract = {
        id: Date.now(),
        type: state.currentContractType,
        companyId: companyId,
        companyName: company.name,
        amount: amount,
        expiry: expiry || null,
        strike: strike || null,
        createdAt: new Date().toISOString()
    };

    state.user.contracts.push(contract);
    loadActiveContracts();

    // Reset form
    document.getElementById('contract-company').value = '';
    document.getElementById('contract-amount').value = '';
    document.getElementById('contract-expiry').value = '';
    document.getElementById('contract-strike').value = '';
    document.querySelectorAll('.contract-type-btn').forEach(btn => btn.classList.remove('active'));
    state.currentContractType = null;
    updateContractForm();

    alert('Contract created successfully!');
}

function loadActiveContracts() {
    const list = document.getElementById('active-contracts-list');
    if (!list) return;

    if (state.user.contracts.length === 0) {
        list.innerHTML = '<p class="placeholder-text">No active contracts</p>';
        return;
    }

    list.innerHTML = state.user.contracts.map(contract => `
        <div class="contract-item">
            <h5>${contract.companyName} - ${contract.type.toUpperCase()}</h5>
            <p>Amount: $${contract.amount.toLocaleString()}</p>
            ${contract.expiry ? `<p>Expiry: ${new Date(contract.expiry).toLocaleDateString()}</p>` : ''}
            ${contract.strike ? `<p>Strike: $${contract.strike}</p>` : ''}
            <p style="font-size: 0.8rem; color: var(--text-muted);">Created: ${new Date(contract.createdAt).toLocaleDateString()}</p>
        </div>
    `).join('');
}

// Company Reports
function generateMockCompanyReports() {
    const companies = [
        'ACME Corporation',
        'TechGlobal Industries',
        'Green Energy Solutions',
        'Manufacturing Co Ltd',
        'EcoTech Systems',
        'Sustainable Materials Inc',
        'Carbon Neutral Corp',
        'Renewable Power Group'
    ];
    
    const industries = [
        'Technology',
        'Manufacturing',
        'Energy',
        'Transportation',
        'Agriculture',
        'Construction'
    ];
    
    const statuses = ['verified', 'pending', 'rejected'];
    const statusWeights = [0.7, 0.25, 0.05]; // 70% verified, 25% pending, 5% rejected
    
    const reports = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
        const daysAgo = Math.floor(Math.random() * 90); // Reports from last 90 days
        const reportDate = new Date(now);
        reportDate.setDate(reportDate.getDate() - daysAgo);
        
        const companyName = companies[Math.floor(Math.random() * companies.length)];
        const industry = industries[Math.floor(Math.random() * industries.length)];
        
        // Weighted random status
        const rand = Math.random();
        let status = 'verified';
        if (rand > statusWeights[0]) {
            status = rand > statusWeights[0] + statusWeights[1] ? 'rejected' : 'pending';
        }
        
        // CO2 emissions data
        const baseCO2 = 500 + Math.random() * 1000;
        const co2Reduction = status === 'verified' ? 5 + Math.random() * 20 : (status === 'pending' ? -2 + Math.random() * 5 : -10 - Math.random() * 10);
        const currentCO2 = baseCO2 * (1 - co2Reduction / 100);
        
        // Carbon credits (only for verified reports)
        const carbonCredits = status === 'verified' ? Math.floor(100 + Math.random() * 500) : 0;
        
        // Investors
        const investors = Math.floor(50 + Math.random() * 500);
        
        // Total investment
        const totalInvestment = investors * (100 + Math.random() * 500);
        
        // Verification details
        const verificationMethod = status === 'verified' ? 'FDC Consensus' : (status === 'pending' ? 'Under Review' : 'Failed Verification');
        const verificationRound = status === 'verified' ? Math.floor(1000 + Math.random() * 9000) : null;
        
        reports.push({
            id: i + 1,
            companyName: companyName,
            industry: industry,
            reportDate: reportDate,
            status: status,
            co2Emissions: {
                current: Math.round(currentCO2),
                previous: Math.round(baseCO2),
                reduction: Math.round(co2Reduction * 10) / 10,
                unit: 'tCO₂e'
            },
            carbonCredits: carbonCredits,
            investors: investors,
            totalInvestment: totalInvestment,
            verificationMethod: verificationMethod,
            verificationRound: verificationRound,
            reportPeriod: `Q${Math.floor(Math.random() * 4) + 1} ${reportDate.getFullYear()}`,
            complianceScore: status === 'verified' ? Math.floor(80 + Math.random() * 20) : (status === 'pending' ? Math.floor(60 + Math.random() * 20) : Math.floor(20 + Math.random() * 40))
        });
    }
    
    // Sort by date (most recent first)
    reports.sort((a, b) => b.reportDate - a.reportDate);
    
    return reports;
}

function renderCompanyReports() {
    const container = document.getElementById('company-reports-container');
    if (!container) return;
    
    const reports = generateMockCompanyReports();
    
    container.innerHTML = reports.map(report => {
        const dateStr = report.reportDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        const statusClass = report.status;
        const statusIcon = report.status === 'verified' ? '✓' : (report.status === 'pending' ? '⏳' : '✗');
        const statusText = report.status === 'verified' ? 'Verified' : (report.status === 'pending' ? 'Pending' : 'Rejected');
        
        const co2Change = report.co2Emissions.reduction;
        const co2ChangeClass = co2Change > 0 ? 'positive' : 'negative';
        const co2ChangeIcon = co2Change > 0 ? '↓' : '↑';
        
        return `
            <div class="company-report-card">
                <div class="report-header">
                    <div>
                        <h3 class="report-company-name">${report.companyName}</h3>
                        <span class="report-status ${statusClass}">
                            ${statusIcon} ${statusText}
                        </span>
                    </div>
                    <div class="report-date">${dateStr}</div>
                </div>
                
                <div class="report-metrics">
                    <div class="report-metric">
                        <span class="report-metric-label">Carbon Credits</span>
                        <span class="report-metric-value ${report.carbonCredits > 0 ? 'positive' : ''}">${report.carbonCredits.toLocaleString()} CC</span>
                    </div>
                    <div class="report-metric">
                        <span class="report-metric-label">Investors</span>
                        <span class="report-metric-value">${report.investors.toLocaleString()}</span>
                    </div>
                    <div class="report-metric">
                        <span class="report-metric-label">Total Investment</span>
                        <span class="report-metric-value">$${report.totalInvestment.toLocaleString()}</span>
                    </div>
                    <div class="report-metric">
                        <span class="report-metric-label">Compliance Score</span>
                        <span class="report-metric-value ${report.complianceScore >= 80 ? 'positive' : (report.complianceScore < 60 ? 'negative' : '')}">${report.complianceScore}%</span>
                    </div>
                </div>
                
                <div class="report-co2-section">
                    <div class="report-co2-title">CO₂ Emissions Report</div>
                    <div class="report-co2-value">${report.co2Emissions.current.toLocaleString()} ${report.co2Emissions.unit}</div>
                    <div class="report-co2-change ${co2ChangeClass}">
                        <span>${co2ChangeIcon} ${Math.abs(co2Change).toFixed(1)}%</span>
                        <span style="font-size: 0.75rem; opacity: 0.7;">vs previous period</span>
                    </div>
                </div>
                
                <div class="report-details">
                    <div class="report-detail-row">
                        <span class="report-detail-label">Industry:</span>
                        <span class="report-detail-value">${report.industry}</span>
                    </div>
                    <div class="report-detail-row">
                        <span class="report-detail-label">Report Period:</span>
                        <span class="report-detail-value">${report.reportPeriod}</span>
                    </div>
                    <div class="report-detail-row">
                        <span class="report-detail-label">Previous Emissions:</span>
                        <span class="report-detail-value">${report.co2Emissions.previous.toLocaleString()} ${report.co2Emissions.unit}</span>
                    </div>
                </div>
                
                <div class="report-footer">
                    <div class="report-verification-badge ${report.status === 'verified' ? 'verified' : ''}">
                        ${report.status === 'verified' ? '✓' : ''} ${report.verificationMethod}
                        ${report.verificationRound ? ` • Round #${report.verificationRound}` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Portfolio Tab
function loadPortfolio() {
    updatePortfolioStats();
    renderHoldings();
    renderIncomeChart();
    renderIncomeHistory();
    loadWalletAddress();
    renderPlasmaTerminal();
    // Start polling for plasma commands if not already started
    if (!state.plasmaTerminalInterval) {
        state.plasmaTerminalInterval = setInterval(renderPlasmaTerminal, 2000); // Update every 2 seconds
    }
}

function updatePortfolioStats() {
    const totalCredits = state.user.holdings.reduce((sum, h) => sum + (h.credits || 0), 0);
    const totalValue = state.user.holdings.reduce((sum, h) => sum + h.amount, 0);
    const totalIncome = state.user.incomeHistory.reduce((sum, i) => sum + i.amount, 0);
    const roi = totalValue > 0 ? ((totalIncome / totalValue) * 100).toFixed(2) : 0;

    document.getElementById('portfolio-credits').textContent = totalCredits.toLocaleString() + ' CC';
    document.getElementById('portfolio-value').textContent = '$' + totalValue.toLocaleString();
    document.getElementById('portfolio-income').textContent = '$' + totalIncome.toLocaleString();
    document.getElementById('portfolio-roi').textContent = roi + '%';
}

function renderHoldings() {
    const list = document.getElementById('holdings-list');
    if (!list) return;

    if (state.user.holdings.length === 0) {
        list.innerHTML = '<p class="placeholder-text">No holdings yet. Start investing in the Market tab!</p>';
        return;
    }

    list.innerHTML = state.user.holdings.map(holding => {
        const company = state.companies.find(c => c.id === holding.companyId);
        return `
            <div class="holding-item">
                <h4>${holding.companyName}</h4>
                <p>Investment: $${holding.amount.toLocaleString()}</p>
                <p>Share: ${holding.share}%</p>
                <p>Carbon Credits: ${(holding.credits || 0).toLocaleString()} CC</p>
                ${company ? `<p>Current Value: $${(holding.amount * (1 + parseFloat(company.co2Reduction) / 100)).toFixed(2)}</p>` : ''}
            </div>
        `;
    }).join('');
}

function renderIncomeChart() {
    const ctx = document.getElementById('income-chart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (ctx.chart) {
        ctx.chart.destroy();
    }

    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const incomeData = last7Days.map(() => Math.random() * 1000);

    // Set fixed height for canvas
    ctx.style.width = '100%';
    ctx.style.height = '100%';
    ctx.style.maxHeight = '200px';

    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Daily Income',
                data: incomeData,
                borderColor: '#3fb950',
                backgroundColor: 'rgba(63, 185, 80, 0.08)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#3fb950',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#161b22',
                    borderColor: '#30363d',
                    borderWidth: 1,
                    titleColor: '#e6edf3',
                    bodyColor: '#8b949e',
                    padding: 12,
                    titleFont: {
                        size: 12,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13,
                        family: "'SF Mono', monospace"
                    },
                    displayColors: false,
                    cornerRadius: 6,
                    callbacks: {
                        label: function(context) {
                            return '$' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#21262d',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#8b949e',
                        font: {
                            size: 11,
                            family: "'SF Mono', monospace"
                        },
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#8b949e',
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function renderIncomeHistory() {
    const list = document.getElementById('income-list');
    if (!list) return;

    if (state.user.incomeHistory.length === 0) {
        list.innerHTML = '<p class="placeholder-text">No income history yet</p>';
        return;
    }

    list.innerHTML = state.user.incomeHistory.map(income => `
        <div class="income-item ${income.amount >= 0 ? 'positive' : 'negative'}">
            <div>
                <strong>${income.source}</strong>
                <p style="font-size: 0.8rem; color: var(--text-muted);">${new Date(income.date).toLocaleDateString()}</p>
            </div>
            <strong>${income.amount >= 0 ? '+' : ''}$${income.amount.toFixed(2)}</strong>
        </div>
    `).join('');
}

// Plasma Terminal
let plasmaCommandsHistory = [];

async function renderPlasmaTerminal() {
    const terminal = document.getElementById('plasma-terminal');
    if (!terminal) return;

    try {
        // Fetch plasma commands from backend
        const response = await fetch(`${API_BASE}/plasma-commands`);
        const data = await response.json();
        
        if (data.plasma_commands && Array.isArray(data.plasma_commands)) {
            // Update history if we have new commands
            const newCommands = data.plasma_commands.filter(cmd => 
                !plasmaCommandsHistory.some(existing => 
                    existing.timestamp === cmd.timestamp && existing.command === cmd.command
                )
            );
            
            if (newCommands.length > 0) {
                plasmaCommandsHistory = [...plasmaCommandsHistory, ...newCommands].slice(-50); // Keep last 50 commands
            }
        }
    } catch (error) {
        console.error('Error fetching plasma commands:', error);
    }

    // Render terminal content
    if (plasmaCommandsHistory.length === 0) {
        terminal.innerHTML = `
            <div class="terminal-line">
                <span class="terminal-prompt">$</span>
                <span class="terminal-text">Waiting for Plasma commands...</span>
            </div>
        `;
        return;
    }

    // Render all commands
    terminal.innerHTML = plasmaCommandsHistory.map(cmd => {
        const timestamp = new Date(cmd.timestamp * 1000).toLocaleTimeString();
        let commandClass = 'terminal-command';
        let outputClass = 'terminal-text';
        
        if (cmd.status === 'success') {
            outputClass = 'terminal-success';
        } else if (cmd.status === 'error') {
            outputClass = 'terminal-error';
        } else if (cmd.status === 'info') {
            outputClass = 'terminal-info';
        }

        let output = '';
        if (cmd.output) {
            output = `<div class="terminal-line">
                <span class="terminal-text"></span>
                <span class="${outputClass}">${escapeHtml(cmd.output)}</span>
            </div>`;
        }

        return `
            <div class="terminal-line">
                <span class="terminal-prompt">$</span>
                <span class="${commandClass}">${escapeHtml(cmd.command)}</span>
                <span class="terminal-timestamp">${timestamp}</span>
            </div>
            ${output}
        `;
    }).join('');

    // Auto-scroll to bottom
    terminal.scrollTop = terminal.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Wallet Address Management
function isValidEthereumAddress(address) {
    if (!address) return false;
    // Basic Ethereum address validation: 0x followed by 40 hex characters
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
}

async function loadWalletAddress() {
    try {
        // Try to load from backend first
        const response = await fetch(`${API_BASE}/user-wallet`);
        if (response.ok) {
            const data = await response.json();
            if (data.wallet_address && isValidEthereumAddress(data.wallet_address)) {
                const input = document.getElementById('wallet-address-input');
                if (input) {
                    input.value = data.wallet_address;
                    updateWalletStatus('success', 'Wallet address loaded');
                }
                return;
            }
        }
        
        // Fallback to localStorage
        const savedAddress = localStorage.getItem('plasma_wallet_address');
        if (savedAddress && isValidEthereumAddress(savedAddress)) {
            const input = document.getElementById('wallet-address-input');
            if (input) {
                input.value = savedAddress;
                updateWalletStatus('info', 'Wallet address loaded from local storage');
            }
        }
    } catch (error) {
        console.error('Error loading wallet address:', error);
        // Try localStorage as fallback
        const savedAddress = localStorage.getItem('plasma_wallet_address');
        if (savedAddress && isValidEthereumAddress(savedAddress)) {
            const input = document.getElementById('wallet-address-input');
            if (input) {
                input.value = savedAddress;
                updateWalletStatus('info', 'Wallet address loaded from local storage');
            }
        }
    }
}

async function saveWalletAddress() {
    const input = document.getElementById('wallet-address-input');
    if (!input) return;
    
    const address = input.value.trim();
    
    // Validate address
    if (!address) {
        updateWalletStatus('error', 'Please enter a wallet address');
        return;
    }
    
    if (!isValidEthereumAddress(address)) {
        updateWalletStatus('error', 'Invalid Ethereum address format');
        return;
    }
    
    // Disable button while saving
    const saveBtn = document.getElementById('wallet-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }
    
    try {
        // Save to backend
        const response = await fetch(`${API_BASE}/user-wallet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ wallet_address: address })
        });
        
        if (response.ok) {
            // Also save to localStorage as backup
            localStorage.setItem('plasma_wallet_address', address);
            updateWalletStatus('success', 'Wallet address saved successfully!');
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save wallet address');
        }
    } catch (error) {
        console.error('Error saving wallet address:', error);
        // Fallback to localStorage
        localStorage.setItem('plasma_wallet_address', address);
        updateWalletStatus('success', 'Wallet address saved locally (backend unavailable)');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    }
}

function updateWalletStatus(type, message) {
    const statusText = document.getElementById('wallet-status-text');
    if (!statusText) return;
    
    statusText.className = `wallet-status-text ${type}`;
    statusText.textContent = message;
    
    // Clear status after 5 seconds for success/info messages
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            if (statusText.textContent === message) {
                statusText.textContent = '';
            }
        }, 5000);
    }
}

// Make saveWalletAddress available globally
window.saveWalletAddress = saveWalletAddress;

// Add Enter key support for wallet input
document.addEventListener('DOMContentLoaded', () => {
    const walletInput = document.getElementById('wallet-address-input');
    if (walletInput) {
        walletInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveWalletAddress();
            }
        });
        
        // Real-time validation
        walletInput.addEventListener('input', (e) => {
            const address = e.target.value.trim();
            if (address && !isValidEthereumAddress(address)) {
                e.target.setCustomValidity('Invalid Ethereum address format');
            } else {
                e.target.setCustomValidity('');
            }
        });
    }
});

// Update User Display
function updateUserDisplay() {
    document.getElementById('user-credits').textContent = state.user.credits.toLocaleString() + ' CC';
    document.getElementById('user-balance').textContent = '$' + state.user.balance.toLocaleString();
    
    // Update profile modal if it exists
    const profileCredits = document.getElementById('profile-credits');
    const profileBalance = document.getElementById('profile-balance');
    if (profileCredits) profileCredits.textContent = state.user.credits.toLocaleString() + ' CC';
    if (profileBalance) profileBalance.textContent = '$' + state.user.balance.toLocaleString();
    
    // Update profile investments
    const profileInvestments = document.getElementById('profile-investments');
    if (profileInvestments) {
        const totalInvestments = state.user.holdings.reduce((sum, h) => sum + h.amount, 0);
        profileInvestments.textContent = '$' + totalInvestments.toLocaleString();
    }
    
    // Update profile contracts
    const profileContracts = document.getElementById('profile-contracts');
    if (profileContracts) {
        profileContracts.textContent = state.user.contracts.length.toString();
    }
    
    // Update member since date
    const profileJoined = document.getElementById('profile-joined');
    if (profileJoined && !state.user.joinedDate) {
        state.user.joinedDate = new Date().getFullYear().toString();
    }
    if (profileJoined) {
        profileJoined.textContent = state.user.joinedDate || new Date().getFullYear().toString();
    }
}

// Initialize Menu
function initializeMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const menuDropdown = document.getElementById('menu-dropdown');
    const profileBtn = document.getElementById('menu-profile');
    const settingsBtn = document.getElementById('menu-settings');
    const futurePlansBtn = document.getElementById('menu-future-plans');
    const profileModal = document.getElementById('profile-modal');
    const settingsModal = document.getElementById('settings-modal');
    const futurePlansModal = document.getElementById('future-plans-modal');
    const closeProfile = document.getElementById('close-profile');
    const closeSettings = document.getElementById('close-settings');
    const closeFuturePlans = document.getElementById('close-future-plans');
    
    if (!menuToggle || !menuDropdown) return;
    
    // Toggle menu dropdown
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menuToggle.classList.toggle('active');
        menuDropdown.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuToggle.contains(e.target) && !menuDropdown.contains(e.target)) {
            menuToggle.classList.remove('active');
            menuDropdown.classList.remove('active');
        }
    });
    
    // Profile button
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            menuToggle.classList.remove('active');
            menuDropdown.classList.remove('active');
            if (profileModal) {
                profileModal.classList.add('active');
                updateUserDisplay(); // Refresh profile data
            }
        });
    }
    
    // Settings button
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            menuToggle.classList.remove('active');
            menuDropdown.classList.remove('active');
            if (settingsModal) {
                settingsModal.classList.add('active');
            }
        });
    }
    
    // Future Plans button
    if (futurePlansBtn) {
        futurePlansBtn.addEventListener('click', (e) => {
            e.preventDefault();
            menuToggle.classList.remove('active');
            menuDropdown.classList.remove('active');
            if (futurePlansModal) {
                futurePlansModal.classList.add('active');
            }
        });
    }
    
    // Close modals
    if (closeProfile && profileModal) {
        closeProfile.addEventListener('click', () => {
            profileModal.classList.remove('active');
        });
    }
    
    if (closeSettings && settingsModal) {
        closeSettings.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
    }
    
    if (closeFuturePlans && futurePlansModal) {
        closeFuturePlans.addEventListener('click', () => {
            futurePlansModal.classList.remove('active');
        });
    }
    
    // Close modals when clicking outside
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.classList.remove('active');
            }
        });
    }
    
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('active');
            }
        });
    }
    
    if (futurePlansModal) {
        futurePlansModal.addEventListener('click', (e) => {
            if (e.target === futurePlansModal) {
                futurePlansModal.classList.remove('active');
            }
        });
    }
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (profileModal) profileModal.classList.remove('active');
            if (settingsModal) settingsModal.classList.remove('active');
            if (futurePlansModal) futurePlansModal.classList.remove('active');
            const adminModal = document.getElementById('admin-modal');
            if (adminModal) adminModal.classList.remove('active');
        }
    });
    
    // Admin modal setup
    const adminModal = document.getElementById('admin-modal');
    const closeAdmin = document.getElementById('close-admin');
    
    if (closeAdmin && adminModal) {
        closeAdmin.addEventListener('click', () => {
            adminModal.classList.remove('active');
        });
    }
    
    if (adminModal) {
        adminModal.addEventListener('click', (e) => {
            if (e.target === adminModal) {
                adminModal.classList.remove('active');
            }
        });
    }
}

// Admin Dashboard Functions
function toggleAdminDashboard() {
    const adminModal = document.getElementById('admin-modal');
    if (adminModal) {
        adminModal.classList.toggle('active');
        if (adminModal.classList.contains('active')) {
            adminRefreshStatus();
        }
    }
}

async function adminRefreshStatus() {
    try {
        // Fetch current user data
        const walletResponse = await fetch(`${API_BASE}/user-wallet`);
        if (walletResponse.ok) {
            const walletData = await walletResponse.json();
            const walletDisplay = document.getElementById('admin-display-wallet');
            if (walletDisplay) {
                walletDisplay.textContent = walletData.wallet_address || 'Not set';
            }
        }
        
        // Update credits and balance from state
        const creditsDisplay = document.getElementById('admin-display-credits');
        const balanceDisplay = document.getElementById('admin-display-balance');
        
        if (creditsDisplay) {
            creditsDisplay.textContent = state.user.credits.toLocaleString() + ' CC';
        }
        if (balanceDisplay) {
            balanceDisplay.textContent = '$' + state.user.balance.toLocaleString();
        }
        
        showAdminMessage('Status refreshed', 'success');
    } catch (error) {
        console.error('Error refreshing admin status:', error);
        showAdminMessage('Failed to refresh status', 'error');
    }
}

async function adminUpdateWallet() {
    const input = document.getElementById('admin-wallet-input');
    if (!input) return;
    
    const address = input.value.trim();
    
    if (!address) {
        showAdminMessage('Please enter a wallet address', 'error');
        return;
    }
    
    if (!isValidEthereumAddress(address)) {
        showAdminMessage('Invalid Ethereum address format', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/update-wallet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ wallet_address: address })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAdminMessage('Wallet address updated successfully', 'success');
            adminRefreshStatus();
            // Also update the portfolio wallet input if it exists
            const portfolioWalletInput = document.getElementById('wallet-address-input');
            if (portfolioWalletInput) {
                portfolioWalletInput.value = address;
            }
        } else {
            showAdminMessage(data.error || 'Failed to update wallet', 'error');
        }
    } catch (error) {
        console.error('Error updating wallet:', error);
        showAdminMessage('Failed to update wallet address', 'error');
    }
}

async function adminUpdateCredits() {
    const input = document.getElementById('admin-credits-input');
    if (!input) return;
    
    const credits = parseInt(input.value);
    
    if (isNaN(credits) || credits < 0) {
        showAdminMessage('Please enter a valid number of credits', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/update-credits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ credits: credits })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            state.user.credits = credits;
            updateUserDisplay();
            showAdminMessage(`Carbon credits updated to ${credits.toLocaleString()} CC`, 'success');
            adminRefreshStatus();
            input.value = '';
        } else {
            showAdminMessage(data.error || 'Failed to update credits', 'error');
        }
    } catch (error) {
        console.error('Error updating credits:', error);
        showAdminMessage('Failed to update carbon credits', 'error');
    }
}

async function adminAddMoney() {
    const input = document.getElementById('admin-balance-input');
    if (!input) return;
    
    const amount = parseFloat(input.value);
    
    if (isNaN(amount) || amount <= 0) {
        showAdminMessage('Please enter a valid amount greater than 0', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/add-money`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount: amount })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            state.user.balance += amount;
            updateUserDisplay();
            showAdminMessage(`$${amount.toFixed(2)} added to account`, 'success');
            adminRefreshStatus();
            input.value = '';
        } else {
            showAdminMessage(data.error || 'Failed to add money', 'error');
        }
    } catch (error) {
        console.error('Error adding money:', error);
        showAdminMessage('Failed to add money to account', 'error');
    }
}

async function adminPayUser() {
    const input = document.getElementById('admin-payout-amount');
    if (!input) return;
    
    const amount = parseFloat(input.value);
    
    if (isNaN(amount) || amount <= 0) {
        showAdminMessage('Please enter a valid payout amount greater than 0', 'error');
        return;
    }
    
    try {
        showAdminMessage('Initiating Plasma payout...', 'info');
        
        const response = await fetch(`${API_BASE}/admin/pay-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount: amount })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAdminMessage(`Plasma payout initiated: ${amount} USDT`, 'success');
            // Refresh terminal to show the command
            if (state.plasmaTerminalInterval) {
                renderPlasmaTerminal();
            }
        } else {
            showAdminMessage(data.error || 'Failed to initiate payout', 'error');
        }
    } catch (error) {
        console.error('Error paying user:', error);
        showAdminMessage('Failed to initiate Plasma payout', 'error');
    }
}

async function adminResetUser() {
    if (!confirm('Are you sure you want to reset all user data? This cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/reset-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Reset local state
            state.user.credits = 0;
            state.user.balance = 10000; // Default balance
            state.user.holdings = [];
            state.user.contracts = [];
            state.user.incomeHistory = [];
            
            updateUserDisplay();
            loadPortfolio();
            showAdminMessage('User data reset successfully', 'success');
            adminRefreshStatus();
        } else {
            showAdminMessage(data.error || 'Failed to reset user data', 'error');
        }
    } catch (error) {
        console.error('Error resetting user:', error);
        showAdminMessage('Failed to reset user data', 'error');
    }
}

function showAdminMessage(message, type) {
    const messageEl = document.getElementById('admin-message');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = `admin-message ${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageEl.className = 'admin-message';
        messageEl.textContent = '';
    }, 5000);
}

// Make functions globally available
window.toggleAdminDashboard = toggleAdminDashboard;
window.adminUpdateWallet = adminUpdateWallet;
window.adminUpdateCredits = adminUpdateCredits;
window.adminAddMoney = adminAddMoney;
window.adminPayUser = adminPayUser;
window.adminResetUser = adminResetUser;
window.adminRefreshStatus = adminRefreshStatus;

// Scanning Tab - Cesium Globe Integration
let scanningViewer;
let scanningFlareIntegration;
let scanningSelectedCompany = null;
let scanningSiteMarkers = [];
let scanningCurrentScanResults = null;

// Animation state management for memory efficiency
const scanningAnimationState = {
    isScanning: false,
    animationFrameId: null,
    rotationAnimationId: null,
    cleanupFunctions: []
};

// Load Scanning Tab
function loadScanning() {
    // Initialize settings UI immediately (doesn't require viewer)
    setupEarthRenderingSettings();
    
    // Initialize Cesium if not already initialized
    if (!scanningViewer) {
        initializeScanningCesium();
    }
    
    // Initialize features if viewer is ready
    if (scanningViewer) {
        initializeScanningFeatures();
    }
}

function initializeScanningCesium() {
    if (typeof Cesium === 'undefined') {
        console.error('Cesium library not loaded. Please check the CDN link.');
        const container = document.getElementById('cesium-container');
        if (container) {
            container.innerHTML = 
                '<div style="color: white; padding: 20px; text-align: center;">Error: Cesium library failed to load. Please refresh the page.</div>';
        }
        return;
    }

    try {
        // Use OpenStreetMap as primary provider - it's reliable and free
        // OpenStreetMap shows countries, borders, and land features clearly
        let imageryProvider = null;
        
        try {
            // OpenStreetMap is the most reliable free option
            imageryProvider = new Cesium.OpenStreetMapImageryProvider({
                url: 'https://a.tile.openstreetmap.org/'
            });
            console.log('✓ Using OpenStreetMap imagery provider');
        } catch (e) {
            console.warn('OpenStreetMap failed, trying ESRI:', e);
            try {
                // Fallback to ESRI World Street Map
                imageryProvider = new Cesium.ArcGisMapServerImageryProvider({
                    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer'
                });
                console.log('✓ Using ESRI World Street Map');
            } catch (e2) {
                console.warn('ESRI failed, trying ESRI Imagery:', e2);
                try {
                    // Try ESRI World Imagery (satellite)
                    imageryProvider = new Cesium.ArcGisMapServerImageryProvider({
                        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
                    });
                    console.log('✓ Using ESRI World Imagery');
                } catch (e3) {
                    console.error('All imagery providers failed, using basic fallback:', e3);
                    // Last resort fallback
                    imageryProvider = new Cesium.OpenStreetMapImageryProvider({
                        url: 'https://tile.openstreetmap.org/'
                    });
                }
            }
        }
        
        // Initialize viewer with the imagery provider
        scanningViewer = new Cesium.Viewer('cesium-container', {
            terrainProvider: new Cesium.EllipsoidTerrainProvider(),
            imageryProvider: imageryProvider,
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            vrButton: false,
            infoBox: false,
            selectionIndicator: false
        });
        
        // Configure globe immediately and after a short delay to ensure imagery loads
        if (scanningViewer.scene && scanningViewer.scene.globe) {
            const globe = scanningViewer.scene.globe;
            
            // Set baseColor to white (not transparent) so imagery shows through properly
            globe.baseColor = Cesium.Color.WHITE;
            
            // Ensure globe and imagery are visible
            globe.show = true;
            globe.enableLighting = true;
            globe.showGroundAtmosphere = true;
            globe.depthTestAgainstTerrain = false;
            
            // Disable fog
            if (scanningViewer.scene.fog) {
                scanningViewer.scene.fog.enabled = false;
            }
        }
        
        // Wait for imagery to load, then verify and configure
        setTimeout(() => {
            if (scanningViewer && scanningViewer.scene && scanningViewer.scene.globe) {
                const globe = scanningViewer.scene.globe;
                
                // Ensure baseColor is set correctly for imagery display
                globe.baseColor = Cesium.Color.WHITE;
                globe.show = true;
                
                // Verify and configure imagery layers
                if (scanningViewer.imageryLayers && scanningViewer.imageryLayers.length > 0) {
                    for (let i = 0; i < scanningViewer.imageryLayers.length; i++) {
                        const layer = scanningViewer.imageryLayers.get(i);
                        if (layer) {
                            layer.show = true;
                            layer.alpha = 1.0;
                            console.log(`✓ Imagery layer ${i} configured:`, layer.imageryProvider ? layer.imageryProvider.constructor.name : 'unknown');
                        }
                    }
                } else {
                    console.warn('⚠ No imagery layers found! Trying to add imagery manually...');
                    // If no layers, try adding the provider again
                    if (imageryProvider) {
                        try {
                            scanningViewer.imageryLayers.addImageryProvider(imageryProvider);
                            console.log('✓ Manually added imagery provider');
                        } catch (e) {
                            console.error('Failed to add imagery provider:', e);
                        }
                    }
                }
                
                console.log('✓ Globe fully configured for imagery display');
            }
        }, 500);
        
        // Set initial view
        scanningViewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000)
        });
        
        // Configure zoom - enable mouse wheel zoom and set limits
        const cameraController = scanningViewer.scene.screenSpaceCameraController;
        cameraController.minimumZoomDistance = 10; // Can zoom in very close
        cameraController.maximumZoomDistance = 50000000; // Can zoom out very far
        
        // Explicitly enable all camera controls
        cameraController.enableZoom = true; // Enable zoom
        cameraController.enableRotate = true; // Enable rotation
        cameraController.enableTranslate = true; // Enable panning
        cameraController.enableTilt = true; // Enable tilting
        cameraController.enableLook = true; // Enable look around
        
        // Enable mouse wheel zoom - ensure WHEEL is included
        cameraController.zoomEventTypes = [
            Cesium.CameraEventType.WHEEL,
            Cesium.CameraEventType.PINCH
        ];
        
        // Ensure the container can receive mouse events
        const cesiumContainer = document.getElementById('cesium-container');
        if (cesiumContainer) {
            cesiumContainer.style.pointerEvents = 'auto';
            cesiumContainer.style.touchAction = 'none'; // Prevent default touch behavior
            
            // Ensure mouse wheel events work
            cesiumContainer.addEventListener('wheel', (e) => {
                // Allow Cesium to handle the wheel event
                e.stopPropagation();
            }, { passive: false });
        }
        
        // Set zoom sensitivity for smoother mouse wheel zooming
        cameraController.zoomFactor = 2.0; // How much to zoom per wheel step
        
        // Disable shadows
        scanningViewer.shadows = false;
        if (scanningViewer.scene.globe.shadows !== undefined) {
            scanningViewer.scene.globe.shadows = Cesium.ShadowMode.DISABLED;
        }
        
        // Initialize features
        initializeScanningFeatures();
        
    } catch (error) {
        console.error('Error initializing Cesium:', error);
        const container = document.getElementById('cesium-container');
        if (container) {
            container.innerHTML = 
                '<div style="color: white; padding: 20px; text-align: center;">Error initializing globe. Please refresh the page.</div>';
        }
    }
}

function initializeScanningFeatures() {
    if (!scanningViewer) return;

    // Initialize Flare integration
    if (typeof FlareIntegration !== 'undefined') {
        scanningFlareIntegration = new FlareIntegration();
        scanningFlareIntegration.initialize().catch(err => {
            console.error('Failed to initialize Flare:', err);
        });
    }

    // Setup company selection
    setupScanningCompanySelection();
    
    // Setup location search
    setupScanningLocationSearch();
    
    // Setup scan button
    setupScanningScanButton();
    
    // Setup zoom controls
    setupScanningZoomControls();
    
    // Setup analysis panel
    setupScanningAnalysisPanel();
    
    // Note: Earth rendering settings are initialized in loadScanning() 
    // to ensure they work even if viewer isn't ready yet
}

// Company Selection
function setupScanningCompanySelection() {
    const companySelect = document.getElementById('company-select');
    const companyInfo = document.getElementById('company-info');
    const companyName = document.getElementById('company-name');
    const companyLocation = document.getElementById('company-location');
    const companySitesCount = document.getElementById('company-sites-count');
    const scanButton = document.getElementById('scan-button');

    if (!companySelect || typeof getAllCompanies === 'undefined') return;

    // Populate company dropdown
    const companies = getAllCompanies();
    companySelect.innerHTML = '<option value="">-- Select a company --</option>';
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.name;
        companySelect.appendChild(option);
    });

    companySelect.addEventListener('change', (e) => {
        const companyId = e.target.value;
        
        if (companyId) {
            scanningSelectedCompany = getCompanyById(companyId);
            
            if (scanningSelectedCompany) {
                // Show company info
                companyName.textContent = scanningSelectedCompany.name;
                companyLocation.textContent = scanningSelectedCompany.headquarters.address;
                companySitesCount.textContent = `${scanningSelectedCompany.sites.length} site(s)`;
                companyInfo.classList.remove('hidden');
                
                // Enable scan button
                scanButton.disabled = false;
                
                // Lock camera onto company location
                lockScanningCameraToCompany(scanningSelectedCompany);
                
                // Mark company sites on the globe
                markScanningCompanySites(scanningSelectedCompany);
            }
        } else {
            scanningSelectedCompany = null;
            companyInfo.classList.add('hidden');
            scanButton.disabled = true;
            clearScanningSiteMarkers();
        }
    });
}

// Lock camera onto company headquarters
function lockScanningCameraToCompany(company) {
    if (!scanningViewer || !company) return;

    const hq = company.headquarters;
    
    scanningViewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
            hq.longitude, 
            hq.latitude, 
            50000
        ),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-75), // Much steeper angle, almost straight down
            roll: 0.0
        },
        duration: 2.5
    });
}

// Mark company sites on the globe
function markScanningCompanySites(company) {
    if (!scanningViewer || !company) return;

    clearScanningSiteMarkers();

    company.sites.forEach(site => {
        const position = Cesium.Cartesian3.fromDegrees(
            site.location.longitude,
            site.location.latitude,
            0
        );

        const entity = scanningViewer.entities.add({
            position: position,
            point: {
                pixelSize: 12,
                color: Cesium.Color.CYAN,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            },
            label: {
                text: site.name,
                font: '12px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -10)
            }
        });

        scanningSiteMarkers.push(entity);
    });
}

// Clear site markers
function clearScanningSiteMarkers() {
    if (!scanningViewer) return;
    scanningSiteMarkers.forEach(marker => {
        scanningViewer.entities.remove(marker);
    });
    scanningSiteMarkers = [];
}

// Location search functionality
async function searchScanningLocation(locationName) {
    if (!scanningViewer) {
        console.error('Viewer not initialized');
        return;
    }
    const errorMessage = document.getElementById('error-message');
    const searchButton = document.getElementById('search-button');
    const locationInput = document.getElementById('location-input');
    
    errorMessage.classList.add('hidden');
    searchButton.disabled = true;
    searchButton.textContent = 'Searching...';
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
            {
                headers: {
                    'User-Agent': 'VeridiFi-App'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Network error');
        }
        
        const data = await response.json();
        
        if (data.length === 0) {
            errorMessage.textContent = `Location "${locationName}" not found. Please try a different search term.`;
            errorMessage.classList.remove('hidden');
            searchButton.disabled = false;
            searchButton.textContent = 'Search';
            return;
        }
        
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        
        scanningViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, 10000),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-75), // Much steeper angle, almost straight down
                roll: 0.0
            },
            duration: 2.0
        });
        
        locationInput.value = '';
        searchButton.disabled = false;
        searchButton.textContent = 'Search';
        
    } catch (error) {
        console.error('Error searching location:', error);
        errorMessage.textContent = 'Error searching location. Please check your connection and try again.';
        errorMessage.classList.remove('hidden');
        searchButton.disabled = false;
        searchButton.textContent = 'Search';
    }
}

// Zoom Controls
function setupScanningZoomControls() {
    const zoomInButton = document.getElementById('zoom-in-button');
    const zoomOutButton = document.getElementById('zoom-out-button');
    const zoomResetButton = document.getElementById('zoom-reset-button');
    
    if (zoomInButton) {
        zoomInButton.addEventListener('click', () => {
            zoomIn();
        });
    }
    
    if (zoomOutButton) {
        zoomOutButton.addEventListener('click', () => {
            zoomOut();
        });
    }
    
    if (zoomResetButton) {
        zoomResetButton.addEventListener('click', () => {
            resetZoom();
        });
    }
}

function zoomIn() {
    if (!scanningViewer || typeof Cesium === 'undefined') return;
    
    try {
        const currentHeight = scanningViewer.camera.positionCartographic.height;
        const newHeight = Math.max(currentHeight * 0.5, 10); // Zoom in by 50%, minimum 10m
        
        scanningViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                scanningViewer.camera.positionCartographic.longitude * (180 / Math.PI),
                scanningViewer.camera.positionCartographic.latitude * (180 / Math.PI),
                newHeight
            ),
            duration: 0.5
        });
    } catch (error) {
        console.error('Error zooming in:', error);
    }
}

function zoomOut() {
    if (!scanningViewer || typeof Cesium === 'undefined') return;
    
    try {
        const currentHeight = scanningViewer.camera.positionCartographic.height;
        const newHeight = Math.min(currentHeight * 2, 50000000); // Zoom out by 2x, maximum 50M
        
        scanningViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                scanningViewer.camera.positionCartographic.longitude * (180 / Math.PI),
                scanningViewer.camera.positionCartographic.latitude * (180 / Math.PI),
                newHeight
            ),
            duration: 0.5
        });
    } catch (error) {
        console.error('Error zooming out:', error);
    }
}

function resetZoom() {
    if (!scanningViewer || typeof Cesium === 'undefined') return;
    
    try {
        scanningViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000), // Default view
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-1.57), // Look straight down
                roll: 0.0
            },
            duration: 1.5
        });
    } catch (error) {
        console.error('Error resetting zoom:', error);
    }
}

function setupScanningLocationSearch() {
    const searchButton = document.getElementById('search-button');
    const locationInput = document.getElementById('location-input');
    
    if (searchButton && locationInput) {
        searchButton.addEventListener('click', () => {
            const location = locationInput.value.trim();
            if (location) {
                searchScanningLocation(location);
            }
        });
        
        locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const location = locationInput.value.trim();
                if (location) {
                    searchScanningLocation(location);
                }
            }
        });
    }
}

// Setup scan button
function setupScanningScanButton() {
    const scanButton = document.getElementById('scan-button');
    if (scanButton) {
        scanButton.addEventListener('click', () => {
            if (scanningSelectedCompany && !scanningAnimationState.isScanning) {
                startScanningSatelliteAnimation(scanningSelectedCompany);
            }
        });
    }
}

// Helper functions for satellite animation
function latLonToScanningPosition(lat, lon, radius = 6378137) {
    if (!scanningViewer || typeof Cesium === 'undefined') return null;
    return Cesium.Cartesian3.fromDegrees(lon, lat, radius);
}

function worldToScanningScreen(worldPosition, viewer) {
    if (!viewer || !worldPosition || typeof Cesium === 'undefined') return null;
    const screenPosition = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
        viewer.scene,
        worldPosition
    );
    return screenPosition ? { x: screenPosition.x, y: screenPosition.y } : null;
}

// Enhanced satellite animation - orbiting satellites with animated lines
function startScanningSatelliteAnimation(company) {
    if (!scanningViewer || !company) {
        console.error('Viewer or company not initialized', { viewer: !!scanningViewer, company: !!company });
        return;
    }
    if (scanningAnimationState.isScanning) {
        console.log('Scan already in progress');
        return;
    }
    
    scanningAnimationState.isScanning = true;
    
    const animationContainer = document.getElementById('satellite-animation');
    const svg = document.getElementById('satellite-lines');
    const loadingBar = document.getElementById('loading-bar');
    const scanButton = document.getElementById('scan-button');
    
    // Verify all elements exist
    if (!animationContainer || !svg || !loadingBar) {
        console.error('Missing animation elements:', {
            container: !!animationContainer,
            svg: !!svg,
            loadingBar: !!loadingBar
        });
        scanningAnimationState.isScanning = false;
        return;
    }
    
    // Reset camera to default position (zoomed out view of entire globe)
    if (scanningViewer && scanningViewer.camera) {
        scanningViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-90),
                roll: 0.0
            },
            duration: 1.5,
            complete: function() {
                // Start slow rotation after camera reaches default position
                startGlobeRotation();
            }
        });
    }
    
    // Function to start slow globe rotation
    function startGlobeRotation() {
        if (!scanningViewer || !scanningAnimationState.isScanning) return;
        
        const rotationSpeed = 0.001; // Slow rotation speed (radians per frame)
        let currentLongitude = 0;
        const cameraHeight = 20000000; // Keep camera at fixed height
        
        function rotateGlobe() {
            if (!scanningAnimationState.isScanning || !scanningViewer) {
                return;
            }
            
            currentLongitude += rotationSpeed;
            // Keep longitude in valid range
            if (currentLongitude >= Cesium.Math.TWO_PI) {
                currentLongitude -= Cesium.Math.TWO_PI;
            }
            
            // Rotate camera around the globe by updating position
            // Camera looks down at the center from above
            const longitude = Cesium.Math.toDegrees(currentLongitude);
            const latitude = 0; // Keep at equator for full globe view
            
            // Update camera position and orientation smoothly
            const cameraPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, cameraHeight);
            const center = Cesium.Cartesian3.ZERO;
            
            scanningViewer.camera.position = cameraPosition;
            scanningViewer.camera.direction = Cesium.Cartesian3.normalize(
                Cesium.Cartesian3.subtract(center, cameraPosition, new Cesium.Cartesian3()),
                new Cesium.Cartesian3()
            );
            scanningViewer.camera.up = Cesium.Cartesian3.UNIT_Z;
            scanningViewer.camera.right = Cesium.Cartesian3.cross(
                scanningViewer.camera.direction,
                scanningViewer.camera.up,
                new Cesium.Cartesian3()
            );
            
            scanningAnimationState.rotationAnimationId = requestAnimationFrame(rotateGlobe);
        }
        
        scanningAnimationState.rotationAnimationId = requestAnimationFrame(rotateGlobe);
    }
    
    // Clear any existing satellites
    const existingSatellites = animationContainer.querySelectorAll('.satellite');
    existingSatellites.forEach(sat => sat.remove());
    svg.innerHTML = ''; // Clear all lines
    
    // Reset animation state
    loadingBar.style.width = '0%';
    
    // Show animation container
    animationContainer.classList.remove('hidden');
    scanButton.disabled = true;
    
    console.log('Starting satellite animation for company:', company.name);
    
    // Show terminal
    showScanningTerminal();
    
    // Get company location
    const companyLat = company.headquarters.latitude;
    const companyLon = company.headquarters.longitude;
    const groundPos3D = latLonToScanningPosition(companyLat, companyLon, 6378137);
    
    // Create multiple satellites in orbit around the world
    const satelliteCount = 6;
    const orbitRadius = 6378137 + 20000000; // Earth radius + 20,000 km
    const satellites = [];
    const lines = [];
    
    // Set up SVG
    svg.setAttribute('width', window.innerWidth);
    svg.setAttribute('height', window.innerHeight);
    
    // Create satellites distributed around the globe
    for (let i = 0; i < satelliteCount; i++) {
        // Distribute satellites evenly around the globe
        const angle = (i / satelliteCount) * Cesium.Math.TWO_PI;
        const lat = Math.sin(angle) * 60; // Between -60 and 60 degrees
        const lon = (angle / Cesium.Math.TWO_PI) * 360; // 0 to 360 degrees
        
        // Create satellite element
        const satellite = document.createElement('div');
        satellite.className = 'satellite';
        satellite.id = `satellite-${i}`;
        satellite.innerHTML = '<pre class="satellite-art">    /\\\n   /  \\\n  |    |\n  |____|\n   \\  /\n    \\/</pre>';
        animationContainer.appendChild(satellite);
        
        // Create line element
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'signal-line');
        line.setAttribute('id', `line-${i}`);
        line.setAttribute('stroke', '#00d4aa');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('opacity', '0.6');
        svg.appendChild(line);
        
        satellites.push({
            element: satellite,
            lat: lat,
            lon: lon,
            angle: angle,
            orbitSpeed: 0.0003 + (i * 0.0001) // Different speeds for each satellite
        });
        
        lines.push(line);
    }
    
    // Animation loop
    let lastFrameTime = performance.now();
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    const animationStartTime = Date.now();
    
    const updatePositions = (currentTime) => {
        if (currentTime - lastFrameTime < frameInterval) {
            scanningAnimationState.animationFrameId = requestAnimationFrame(updatePositions);
            return;
        }
        lastFrameTime = currentTime;
        
        if (!scanningAnimationState.isScanning) {
            return;
        }
        
        const elapsed = (Date.now() - animationStartTime) / 1000; // Time in seconds
        
        // Update each satellite's position (orbiting)
        satellites.forEach((sat, index) => {
            // Update orbital position
            const currentAngle = sat.angle + (elapsed * sat.orbitSpeed);
            const lat = Math.sin(currentAngle) * 60;
            const lon = ((currentAngle % Cesium.Math.TWO_PI) / Cesium.Math.TWO_PI) * 360;
            
            // Convert to 3D position
            const satPos3D = latLonToScanningPosition(lat, lon, orbitRadius);
            const satScreen = worldToScanningScreen(satPos3D, scanningViewer);
            
            if (satScreen) {
                // Position satellite
                sat.element.style.left = `${satScreen.x}px`;
                sat.element.style.top = `${satScreen.y}px`;
                sat.element.style.display = 'block';
                
                // Get ground position on screen
                const groundScreen = worldToScanningScreen(groundPos3D, scanningViewer);
                
                if (groundScreen) {
                    // Animate line back and forth between satellite and ground
                    const lineProgress = ((elapsed * 0.5 + index * 0.3) % 2) / 2; // 2 second cycle, offset per satellite
                    const easedProgress = lineProgress < 0.5 
                        ? 2 * lineProgress * lineProgress 
                        : 1 - Math.pow(-2 * lineProgress + 2, 2) / 2;
                    
                    // Calculate animated point along the line
                    const satX = satScreen.x;
                    const satY = satScreen.y;
                    const groundX = groundScreen.x;
                    const groundY = groundScreen.y;
                    
                    const animatedX = satX + (groundX - satX) * easedProgress;
                    const animatedY = satY + (groundY - satY) * easedProgress;
                    
                    // Draw line from satellite to animated point
                    lines[index].setAttribute('x1', satX);
                    lines[index].setAttribute('y1', satY);
                    lines[index].setAttribute('x2', animatedX);
                    lines[index].setAttribute('y2', animatedY);
                    lines[index].style.display = 'block';
                } else {
                    lines[index].style.display = 'none';
                }
            } else {
                sat.element.style.display = 'none';
                lines[index].style.display = 'none';
            }
        });
        
        if (scanningAnimationState.isScanning) {
            scanningAnimationState.animationFrameId = requestAnimationFrame(updatePositions);
        }
    };
    
    scanningAnimationState.animationFrameId = requestAnimationFrame(updatePositions);
    
    setTimeout(() => {
        loadingBar.style.width = '100%';
    }, 100);
    
    // Perform Flare scan
    performScanningFlareScan(company, loadingBar).then(results => {
        scanningCurrentScanResults = results;
        
        setTimeout(() => {
            // Clean up satellites and lines
            satellites.forEach(sat => sat.element.remove());
            lines.forEach(line => line.remove());
            
            animationContainer.classList.add('hidden');
            loadingBar.style.width = '0%';
            scanningAnimationState.isScanning = false;
            scanButton.disabled = false;
            
            if (scanningAnimationState.animationFrameId) {
                cancelAnimationFrame(scanningAnimationState.animationFrameId);
                scanningAnimationState.animationFrameId = null;
            }
            
            // Stop globe rotation
            if (scanningAnimationState.rotationAnimationId) {
                cancelAnimationFrame(scanningAnimationState.rotationAnimationId);
                scanningAnimationState.rotationAnimationId = null;
            }
            
            hideScanningTerminal();
            
            showScanningAnalysisPanel(results);
        }, 1500);
    }).catch(error => {
        console.error('Scan failed:', error);
        scanningAnimationState.isScanning = false;
        scanButton.disabled = false;
        
        // Clean up
        satellites.forEach(sat => sat.element.remove());
        lines.forEach(line => line.remove());
        
        if (scanningAnimationState.animationFrameId) {
            cancelAnimationFrame(scanningAnimationState.animationFrameId);
            scanningAnimationState.animationFrameId = null;
        }
        
        // Stop globe rotation
        if (scanningAnimationState.rotationAnimationId) {
            cancelAnimationFrame(scanningAnimationState.rotationAnimationId);
            scanningAnimationState.rotationAnimationId = null;
        }
        
        animationContainer.classList.add('hidden');
        loadingBar.style.width = '0%';
        hideScanningTerminal();
    });
}

// Terminal functions
function showScanningTerminal() {
    const terminal = document.getElementById('flare-terminal');
    const terminalContent = document.getElementById('terminal-content');
    if (terminal && terminalContent) {
        terminalContent.innerHTML = '';
        terminal.classList.remove('hidden');
        addScanningTerminalLog('⚡ Flare Stack Terminal Initialized', 'system');
        addScanningTerminalLog('🔗 Connecting to Flare API...', 'info');
    }
}

function hideScanningTerminal() {
    const terminal = document.getElementById('flare-terminal');
    if (terminal) {
        setTimeout(() => {
            terminal.classList.add('hidden');
        }, 500);
    }
}

function addScanningTerminalLog(message, type = 'info') {
    const terminalContent = document.getElementById('terminal-content');
    if (!terminalContent) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `terminal-log terminal-log-${type}`;
    
    const typeIcon = {
        'system': '⚡',
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌',
        'api': '📡'
    }[type] || '•';
    
    logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> <span class="log-icon">${typeIcon}</span> <span class="log-message">${message}</span>`;
    
    terminalContent.appendChild(logEntry);
    
    requestAnimationFrame(() => {
        terminalContent.scrollTop = terminalContent.scrollHeight;
    });
    
    setTimeout(() => {
        terminalContent.scrollTop = terminalContent.scrollHeight;
    }, 10);
}

// Generate realistic Flare stack API calls for terminal
function generateScanningMockAPICalls(company) {
    const apiCalls = [
        { delay: 500, message: 'POST /api/v1/fdc/prepare-request', type: 'api', details: 'Preparing FDC attestation request for carbon intensity data' },
        { delay: 800, message: '✓ FDC request prepared successfully', type: 'success' },
        { delay: 1200, message: `POST /api/v1/veridiFi/submit-attestation`, type: 'api', details: `Submitting attestation for ${company.name}` },
        { delay: 1500, message: `✓ Attestation submitted to VeridiFiCore contract`, type: 'success' },
        { delay: 1800, message: `GET /api/v1/fdc/round-status`, type: 'api', details: 'Checking voting round status' },
        { delay: 2200, message: '✓ Round finalized, waiting for consensus...', type: 'info' },
        { delay: 2800, message: `GET /api/v1/fdc/proof-by-request-round-raw`, type: 'api', details: 'Retrieving FDC proof' },
        { delay: 3200, message: '✓ FDC proof retrieved and verified', type: 'success' },
        { delay: 3600, message: `POST /api/v1/veridiFi/process-proof`, type: 'api', details: 'Processing proof on-chain' },
        { delay: 4000, message: '✓ Proof processed, carbon intensity stored', type: 'success' },
        { delay: 4500, message: `GET /api/v1/companies/${company.id}/sites`, type: 'api', details: 'Fetching company sites' },
        { delay: 4800, message: `✓ Retrieved ${company.sites.length} site(s)`, type: 'success' },
    ];
    
    company.sites.forEach((site, index) => {
        const baseDelay = 5000 + (index * 1000);
        apiCalls.push({
            delay: baseDelay,
            message: `GET /api/v1/sites/${site.id}/emissions/current`,
            type: 'api',
            details: `Fetching emissions for ${site.name}`
        });
        apiCalls.push({
            delay: baseDelay + 300,
            message: `✓ Site "${site.name}" emissions: ${(Math.random() * 500 + 300).toFixed(0)} CO2e`,
            type: 'success'
        });
        apiCalls.push({
            delay: baseDelay + 600,
            message: `GET /api/v1/sites/${site.id}/coverage`,
            type: 'api',
            details: 'Checking sensor coverage'
        });
        apiCalls.push({
            delay: baseDelay + 900,
            message: `✓ Coverage: ${(85 + Math.random() * 15).toFixed(1)}% (${8 + Math.floor(Math.random() * 5)}/12 sensors active)`,
            type: 'success'
        });
    });
    
    const finalDelay = 5000 + (company.sites.length * 1000) + 1000;
    apiCalls.push({
        delay: finalDelay,
        message: 'POST /api/v1/analysis/calculate-status',
        type: 'api',
        details: 'Calculating overall status and CO2 goals progress'
    });
    apiCalls.push({
        delay: finalDelay + 400,
        message: '✓ Status calculation completed',
        type: 'success'
    });
    apiCalls.push({
        delay: finalDelay + 800,
        message: 'GET /api/v1/co2-goals/company-status',
        type: 'api',
        details: 'Fetching CO2 goals and coverage metrics'
    });
    apiCalls.push({
        delay: finalDelay + 1200,
        message: '✓ CO2 goals and coverage data retrieved',
        type: 'success'
    });
    
    return apiCalls;
}

// Perform Flare scan with terminal logging
async function performScanningFlareScan(company, loadingBar) {
    if (!scanningFlareIntegration) {
        throw new Error('Flare integration not initialized');
    }
    
    const scanStartTime = Date.now();
    const minScanDuration = 12000; // Increased for more realistic timing
    
    // Generate realistic API calls
    const apiCalls = generateScanningMockAPICalls(company);
    
    // Log API calls with realistic timing
    apiCalls.forEach(call => {
        setTimeout(() => {
            let logMessage = call.message;
            if (call.details) {
                logMessage += ` - ${call.details}`;
            }
            addScanningTerminalLog(logMessage, call.type);
        }, call.delay);
    });
    
    // Update progress bar based on API calls
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 1.2;
        if (progress < 95) {
            loadingBar.style.width = `${progress}%`;
        }
    }, 150);
    
    try {
        // Start the actual scan
        const scanPromise = scanningFlareIntegration.scanCompany(company);
        
        // Ensure minimum duration for realistic feel
        const minDurationPromise = new Promise(resolve => {
            setTimeout(resolve, minScanDuration);
        });
        
        const [results] = await Promise.all([scanPromise, minDurationPromise]);
        
        const elapsed = Date.now() - scanStartTime;
        if (elapsed < minScanDuration) {
            await new Promise(resolve => setTimeout(resolve, minScanDuration - elapsed));
        }
        
        clearInterval(progressInterval);
        loadingBar.style.width = '100%';
        
        // Log final summary with CO2 goals and coverage
        setTimeout(() => {
            if (results.co2Goals) {
                addScanningTerminalLog(`📊 CO2 Goals: ${results.co2Goals.currentEmissions.toFixed(0)}/${results.co2Goals.annualTarget.toFixed(0)} CO2e (${results.co2Goals.progressPercent.toFixed(1)}%)`, 'info');
            }
            if (results.co2Coverage) {
                addScanningTerminalLog(`📡 Coverage: ${results.co2Coverage.coveragePercent.toFixed(1)}% (${results.co2Coverage.sitesMonitored}/${results.co2Coverage.totalSites} sites)`, 'info');
            }
            addScanningTerminalLog('🎉 All Flare stack API calls completed successfully', 'success');
            addScanningTerminalLog('✅ Scan report generated and ready for review', 'success');
        }, 500);
        
        return results;
    } catch (error) {
        clearInterval(progressInterval);
        addScanningTerminalLog(`❌ Error: ${error.message}`, 'error');
        addScanningTerminalLog('⚠️ Falling back to cached data if available', 'warning');
        throw error;
    }
}

// Analysis Panel
// Earth Rendering Settings
function setupEarthRenderingSettings() {
    const settingsToggle = document.getElementById('settings-toggle-button');
    const settingsPanel = document.getElementById('earth-settings-panel');
    const closeSettings = document.getElementById('close-earth-settings'); // Fixed: use unique ID
    
    // Toggle settings panel
    if (settingsToggle && settingsPanel) {
        settingsToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            settingsPanel.classList.toggle('hidden');
            console.log('Settings panel toggled, hidden:', settingsPanel.classList.contains('hidden'));
        });
    } else {
        console.warn('Settings toggle button or panel not found:', {
            toggle: !!settingsToggle,
            panel: !!settingsPanel
        });
    }
    
    // Close button handler
    if (closeSettings && settingsPanel) {
        closeSettings.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            settingsPanel.classList.add('hidden');
            console.log('Settings panel closed');
        });
    } else {
        console.warn('Close button or panel not found:', {
            closeButton: !!closeSettings,
            panel: !!settingsPanel
        });
    }
    
    // Also close panel when clicking outside of it
    if (settingsPanel) {
        document.addEventListener('click', (e) => {
            // Only close if clicking outside the panel and the toggle button
            if (!settingsPanel.contains(e.target) && 
                e.target !== settingsToggle && 
                !settingsToggle?.contains(e.target) &&
                !settingsPanel.classList.contains('hidden')) {
                // Don't auto-close, let user use the close button
            }
        });
    }
    
    // Imagery provider change
    const imageryProviderSelect = document.getElementById('imagery-provider');
    if (imageryProviderSelect) {
        imageryProviderSelect.addEventListener('change', (e) => {
            changeImageryProvider(e.target.value);
        });
    }
    
    // Lighting toggle
    const enableLighting = document.getElementById('enable-lighting');
    if (enableLighting) {
        enableLighting.addEventListener('change', (e) => {
            if (scanningViewer && scanningViewer.scene && scanningViewer.scene.globe) {
                scanningViewer.scene.globe.enableLighting = e.target.checked;
            }
        });
    }
    
    // Atmosphere toggle
    const showAtmosphere = document.getElementById('show-atmosphere');
    if (showAtmosphere) {
        showAtmosphere.addEventListener('change', (e) => {
            if (scanningViewer && scanningViewer.scene && scanningViewer.scene.globe) {
                scanningViewer.scene.globe.showGroundAtmosphere = e.target.checked;
            }
        });
    }
    
    // Base color picker
    const baseColorPicker = document.getElementById('base-color');
    const baseColorText = document.getElementById('base-color-text');
    if (baseColorPicker && baseColorText) {
        baseColorPicker.addEventListener('change', (e) => {
            baseColorText.value = e.target.value;
            applyBaseColor(e.target.value);
        });
        
        baseColorText.addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(color)) {
                baseColorPicker.value = color;
                applyBaseColor(color);
            }
        });
    }
    
    // Atmosphere opacity slider
    const atmosphereOpacity = document.getElementById('atmosphere-opacity');
    const atmosphereOpacityValue = document.getElementById('atmosphere-opacity-value');
    if (atmosphereOpacity && atmosphereOpacityValue) {
        atmosphereOpacity.addEventListener('input', (e) => {
            const value = e.target.value;
            atmosphereOpacityValue.textContent = value + '%';
            if (scanningViewer && scanningViewer.scene && scanningViewer.scene.globe) {
                // Adjust atmosphere intensity (approximate)
                scanningViewer.scene.globe.atmosphereLightIntensity = parseFloat(value) / 100;
            }
        });
    }
    
    // Globe brightness slider
    const globeBrightness = document.getElementById('globe-brightness');
    const globeBrightnessValue = document.getElementById('globe-brightness-value');
    if (globeBrightness && globeBrightnessValue) {
        globeBrightness.addEventListener('input', (e) => {
            const value = e.target.value;
            globeBrightnessValue.textContent = value + '%';
            if (scanningViewer && scanningViewer.scene && scanningViewer.scene.globe) {
                // Adjust brightness by modifying imagery layer alpha
                if (scanningViewer.imageryLayers && scanningViewer.imageryLayers.length > 0) {
                    scanningViewer.imageryLayers.get(0).alpha = parseFloat(value) / 100;
                }
            }
        });
    }
    
    // Terrain toggle
    const showTerrain = document.getElementById('show-terrain');
    if (showTerrain) {
        showTerrain.addEventListener('change', (e) => {
            if (scanningViewer && scanningViewer.scene && scanningViewer.scene.globe) {
                // Toggle terrain exaggeration
                if (e.target.checked) {
                    scanningViewer.scene.globe.terrainExaggeration = 1.0;
                } else {
                    scanningViewer.scene.globe.terrainExaggeration = 0.0;
                }
            }
        });
    }
    
    // Reset button
    const resetSettings = document.getElementById('reset-settings');
    if (resetSettings) {
        resetSettings.addEventListener('click', () => {
            resetEarthSettings();
        });
    }
}

function changeImageryProvider(providerType) {
    if (!scanningViewer || typeof Cesium === 'undefined') {
        console.error('Viewer not initialized');
        return;
    }
    
    let newProvider = null;
    
    try {
        // Create the new provider based on type
        switch(providerType) {
            case 'osm':
                newProvider = new Cesium.OpenStreetMapImageryProvider({
                    url: 'https://a.tile.openstreetmap.org/'
                });
                break;
            case 'esri-street':
                newProvider = new Cesium.ArcGisMapServerImageryProvider({
                    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer',
                    enablePickFeatures: false // Disable feature picking to avoid issues
                });
                break;
            case 'esri-imagery':
                newProvider = new Cesium.ArcGisMapServerImageryProvider({
                    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
                    enablePickFeatures: false
                });
                break;
            case 'esri-topo':
                newProvider = new Cesium.ArcGisMapServerImageryProvider({
                    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer',
                    enablePickFeatures: false
                });
                break;
            default:
                console.warn('Unknown provider type:', providerType);
                return;
        }
        
        // Wait for provider to be ready before switching
        if (newProvider.ready) {
            newProvider.ready.then(() => {
                switchImageryProviderSafely(newProvider, providerType);
            }).catch((error) => {
                console.error('Provider ready promise failed:', error);
                // Try to switch anyway
                switchImageryProviderSafely(newProvider, providerType);
            });
        } else {
            // Provider doesn't have ready promise, switch immediately
            switchImageryProviderSafely(newProvider, providerType);
        }
        
    } catch (error) {
        console.error('Failed to create imagery provider:', error);
        alert('Failed to change imagery provider. Please try again or refresh the page.');
    }
}

function switchImageryProviderSafely(newProvider, providerType) {
    if (!scanningViewer || !newProvider) return;
    
    try {
        // Get current layer count
        const currentLayerCount = scanningViewer.imageryLayers.length;
        
        // Remove all existing imagery layers first
        while (scanningViewer.imageryLayers.length > 0) {
            scanningViewer.imageryLayers.remove(scanningViewer.imageryLayers.get(0), true);
        }
        
        // Small delay to ensure cleanup is complete
        setTimeout(() => {
            try {
                // Add new provider at index 0 (base layer)
                const newLayer = scanningViewer.imageryLayers.addImageryProvider(newProvider);
                
                // Ensure it's visible and configured
                newLayer.show = true;
                newLayer.alpha = 1.0;
                
                // Force a scene render to update
                scanningViewer.scene.requestRender();
                
                console.log('✓ Successfully changed imagery provider to:', providerType);
            } catch (addError) {
                console.error('Error adding new imagery provider:', addError);
                // Try to restore a working provider (OpenStreetMap as fallback)
                try {
                    const fallbackProvider = new Cesium.OpenStreetMapImageryProvider({
                        url: 'https://a.tile.openstreetmap.org/'
                    });
                    scanningViewer.imageryLayers.addImageryProvider(fallbackProvider);
                    console.log('✓ Restored fallback provider (OpenStreetMap)');
                    alert('Failed to load selected imagery provider. Using OpenStreetMap instead.');
                } catch (fallbackError) {
                    console.error('Failed to restore fallback provider:', fallbackError);
                }
            }
        }, 100);
        
    } catch (error) {
        console.error('Error switching imagery provider:', error);
        alert('Error switching imagery provider. Please refresh the page.');
    }
}

function applyBaseColor(colorHex) {
    if (!scanningViewer || typeof Cesium === 'undefined') return;
    
    try {
        // Convert hex to Cesium Color
        const r = parseInt(colorHex.slice(1, 3), 16) / 255;
        const g = parseInt(colorHex.slice(3, 5), 16) / 255;
        const b = parseInt(colorHex.slice(5, 7), 16) / 255;
        
        if (scanningViewer.scene && scanningViewer.scene.globe) {
            scanningViewer.scene.globe.baseColor = new Cesium.Color(r, g, b, 1.0);
        }
    } catch (error) {
        console.error('Failed to apply base color:', error);
    }
}

function resetEarthSettings() {
    if (!scanningViewer || typeof Cesium === 'undefined') return;
    
    // Reset imagery provider
    const imageryProviderSelect = document.getElementById('imagery-provider');
    if (imageryProviderSelect) {
        imageryProviderSelect.value = 'osm';
        changeImageryProvider('osm');
    }
    
    // Reset lighting
    const enableLighting = document.getElementById('enable-lighting');
    if (enableLighting) {
        enableLighting.checked = true;
        if (scanningViewer.scene && scanningViewer.scene.globe) {
            scanningViewer.scene.globe.enableLighting = true;
        }
    }
    
    // Reset atmosphere
    const showAtmosphere = document.getElementById('show-atmosphere');
    if (showAtmosphere) {
        showAtmosphere.checked = true;
        if (scanningViewer.scene && scanningViewer.scene.globe) {
            scanningViewer.scene.globe.showGroundAtmosphere = true;
        }
    }
    
    // Reset base color
    const baseColorPicker = document.getElementById('base-color');
    const baseColorText = document.getElementById('base-color-text');
    if (baseColorPicker && baseColorText) {
        baseColorPicker.value = '#ffffff';
        baseColorText.value = '#ffffff';
        applyBaseColor('#ffffff');
    }
    
    // Reset atmosphere opacity
    const atmosphereOpacity = document.getElementById('atmosphere-opacity');
    const atmosphereOpacityValue = document.getElementById('atmosphere-opacity-value');
    if (atmosphereOpacity && atmosphereOpacityValue) {
        atmosphereOpacity.value = 50;
        atmosphereOpacityValue.textContent = '50%';
        if (scanningViewer.scene && scanningViewer.scene.globe) {
            scanningViewer.scene.globe.atmosphereLightIntensity = 0.5;
        }
    }
    
    // Reset brightness
    const globeBrightness = document.getElementById('globe-brightness');
    const globeBrightnessValue = document.getElementById('globe-brightness-value');
    if (globeBrightness && globeBrightnessValue) {
        globeBrightness.value = 100;
        globeBrightnessValue.textContent = '100%';
        if (scanningViewer.imageryLayers && scanningViewer.imageryLayers.length > 0) {
            scanningViewer.imageryLayers.get(0).alpha = 1.0;
        }
    }
    
    // Reset terrain
    const showTerrain = document.getElementById('show-terrain');
    if (showTerrain) {
        showTerrain.checked = true;
        if (scanningViewer.scene && scanningViewer.scene.globe) {
            scanningViewer.scene.globe.terrainExaggeration = 1.0;
        }
    }
    
    console.log('✓ Earth settings reset to defaults');
}

function setupScanningAnalysisPanel() {
    const closeButton = document.getElementById('close-analysis');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            hideScanningAnalysisPanel();
        });
    }
}

function showScanningAnalysisPanel(results) {
    const panel = document.getElementById('analysis-panel');
    const content = document.getElementById('analysis-content');
    
    if (!panel || !content) return;
    
    content.innerHTML = generateScanningAnalysisHTML(results);
    
    panel.classList.remove('hidden');
}

function hideScanningAnalysisPanel() {
    const panel = document.getElementById('analysis-panel');
    if (panel) {
        panel.classList.add('hidden');
    }
}

function generateScanningAnalysisHTML(results) {
    if (!results) return '<p>No results available</p>';
    
    const statusLabels = {
        'onTrack': 'On Track',
        'behind': 'Behind Target',
        'ahead': 'Ahead of Target'
    };
    
    const overallStatus = results.overallStatus || 'onTrack';
    const progress = results.progress || { onTrack: 0, behind: 0, ahead: 0 };
    const co2Goals = results.co2Goals || {};
    const co2Coverage = results.co2Coverage || {};
    
    let html = `
        <div class="analysis-summary">
            <div class="status-badge status-${overallStatus}">
                <span class="status-icon">${overallStatus === 'ahead' ? '✓' : overallStatus === 'behind' ? '⚠' : '→'}</span>
                <span class="status-text">${statusLabels[overallStatus]}</span>
            </div>
            <div class="progress-stats">
                <div class="stat-item">
                    <span class="stat-label">On Track:</span>
                    <span class="stat-value">${progress.onTrack}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Behind:</span>
                    <span class="stat-value">${progress.behind}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Ahead:</span>
                    <span class="stat-value">${progress.ahead}</span>
                </div>
            </div>
        </div>
        
        ${co2Goals.annualTarget ? `
        <div class="co2-goals-section">
            <h3>CO₂ Goals</h3>
            <div class="goals-metrics">
                <div class="goal-item">
                    <span class="goal-label">Annual Target:</span>
                    <span class="goal-value">${co2Goals.annualTarget.toFixed(0)} CO₂e</span>
                </div>
                <div class="goal-item">
                    <span class="goal-label">Current Emissions:</span>
                    <span class="goal-value">${co2Goals.currentEmissions ? co2Goals.currentEmissions.toFixed(0) : 'N/A'} CO₂e</span>
                </div>
                <div class="goal-item">
                    <span class="goal-label">Progress:</span>
                    <span class="goal-value ${co2Goals.onTrack ? 'positive' : 'negative'}">${co2Goals.progressPercent ? co2Goals.progressPercent.toFixed(1) : '0'}%</span>
                </div>
                <div class="goal-item">
                    <span class="goal-label">Status:</span>
                    <span class="goal-value ${co2Goals.onTrack ? 'positive' : 'negative'}">${co2Goals.onTrack ? 'On Track' : 'At Risk'}</span>
                </div>
                <div class="goal-item">
                    <span class="goal-label">Deadline:</span>
                    <span class="goal-value">${co2Goals.deadline || 'N/A'}</span>
                </div>
            </div>
        </div>
        ` : ''}
        
        ${co2Coverage.coveragePercent ? `
        <div class="coverage-section">
            <h3>CO₂ Coverage</h3>
            <div class="coverage-metrics">
                <div class="coverage-item">
                    <span class="coverage-label">Sites Monitored:</span>
                    <span class="coverage-value">${co2Coverage.sitesMonitored}/${co2Coverage.totalSites}</span>
                </div>
                <div class="coverage-item">
                    <span class="coverage-label">Coverage:</span>
                    <span class="coverage-value">${co2Coverage.coveragePercent.toFixed(1)}%</span>
                </div>
                <div class="coverage-item">
                    <span class="coverage-label">Data Quality:</span>
                    <span class="coverage-value quality-${co2Coverage.dataQuality || 'medium'}">${co2Coverage.dataQuality || 'Medium'}</span>
                </div>
            </div>
        </div>
        ` : ''}
        
        <div class="sites-list">
            <h3>Sites Analysis</h3>
    `;
    
    if (results.sites && results.sites.length > 0) {
        results.sites.forEach(site => {
            const emissions = site.emissions || {};
            const current = emissions.current || 0;
            const target = emissions.target || 0;
            const percentDiff = ((current - target) / target * 100).toFixed(1);
            const trend = emissions.trend || 'stable';
            const coverage = site.coverage || {};
            
            html += `
                <div class="site-card">
                    <div class="site-header">
                        <h4>${site.siteName}</h4>
                        <span class="site-status status-${site.status}">${statusLabels[site.status]}</span>
                    </div>
                    <div class="site-metrics">
                        <div class="metric">
                            <span class="metric-label">Current Emissions:</span>
                            <span class="metric-value">${current.toFixed(0)} CO₂e</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Target:</span>
                            <span class="metric-value">${target.toFixed(0)} CO₂e</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Difference:</span>
                            <span class="metric-value ${percentDiff >= 0 ? 'positive' : 'negative'}">
                                ${percentDiff >= 0 ? '+' : ''}${percentDiff}%
                            </span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Trend:</span>
                            <span class="metric-value trend-${trend}">${trend}</span>
                        </div>
                        ${coverage.percent ? `
                        <div class="metric">
                            <span class="metric-label">Coverage:</span>
                            <span class="metric-value">${coverage.percent.toFixed(1)}% (${coverage.sensorsActive || 0}/${coverage.totalSensors || 12} sensors)</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Data Quality:</span>
                            <span class="metric-value quality-${coverage.dataQuality || 'medium'}">${coverage.dataQuality || 'Medium'}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    
    if (results.recommendations && results.recommendations.length > 0) {
        html += `
            <div class="recommendations">
                <h3>Recommendations</h3>
        `;
        
        results.recommendations.forEach(rec => {
            html += `
                <div class="recommendation-card priority-${rec.priority}">
                    <div class="rec-header">
                        <span class="rec-priority">${rec.priority.toUpperCase()}</span>
                        <h4>${rec.title}</h4>
                    </div>
                    <p class="rec-description">${rec.description}</p>
                    <p class="rec-action">${rec.action}</p>
                </div>
            `;
        });
        
        html += `</div>`;
    }
    
    return html;
}

// Green Treasury Dashboard Functions
let treasuryUpdateInterval = null;
let treasuryLastBtcPrice = 0;
let treasuryLastXrpPrice = 0;
let treasuryProcessedLogIds = new Set();

function loadGreenTreasury() {
    // Start polling for treasury data
    if (treasuryUpdateInterval) {
        clearInterval(treasuryUpdateInterval);
    }
    
    // Initial fetch
    treasuryFetchData();
    
    // Poll every 1.8 seconds
    treasuryUpdateInterval = setInterval(() => {
        if (state.currentTab === 'developer-green-treasury') {
            treasuryFetchData();
        }
    }, 1800);
    
    // Also start developer terminal polling
    if (!agentLogsInterval) {
        startAgentLogsPolling();
    }
}

function treasuryFetchData() {
    fetch('/api/data')
        .then(response => response.json())
        .then(data => {
            treasuryUpdatePrices(data.market_report);
            treasuryUpdateCarbonDial(data.carbon_audit);
            treasuryUpdateFdcVerification(data.fdc_verification_status, data.carbon_audit);
            
            // Update agent status
            if (data.agents_running !== undefined) {
                treasuryUpdateAgentStatus(data.agents_running);
            }
            
            // Update agent logs
            if (data.agent_logs && Array.isArray(data.agent_logs)) {
                data.agent_logs.forEach(logEntry => {
                    const logId = `${logEntry.timestamp}-${logEntry.agent}-${logEntry.message}`;
                    if (!treasuryProcessedLogIds.has(logId)) {
                        treasuryProcessedLogIds.add(logId);
                        treasuryAddLogEntry(logEntry.agent.toLowerCase(), logEntry.message, logEntry.timestamp);
                        
                        // Keep set size manageable
                        if (treasuryProcessedLogIds.size > 100) {
                            const firstId = treasuryProcessedLogIds.values().next().value;
                            treasuryProcessedLogIds.delete(firstId);
                        }
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error fetching treasury data:', error);
        });
}

function treasuryUpdatePrices(marketReport) {
    if (!marketReport || marketReport.error) return;
    
    const btcPrice = marketReport.btc_usd || 0;
    const xrpPrice = marketReport.xrp_usd || 0;
    const btcTimestamp = marketReport.btc_timestamp || 0;
    const xrpTimestamp = marketReport.xrp_timestamp || 0;
    
    // Update BTC
    if (btcPrice !== treasuryLastBtcPrice) {
        const btcEl = document.getElementById('treasury-btc-price');
        const btcTimeEl = document.getElementById('treasury-btc-timestamp');
        if (btcEl) btcEl.textContent = `$${btcPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (btcTimeEl) btcTimeEl.textContent = `Updated: ${treasuryFormatTimestamp(btcTimestamp)}`;
        treasuryLastBtcPrice = btcPrice;
        treasuryTriggerPulse(0);
    }
    
    // Update XRP
    if (xrpPrice !== treasuryLastXrpPrice) {
        const xrpEl = document.getElementById('treasury-xrp-price');
        const xrpTimeEl = document.getElementById('treasury-xrp-timestamp');
        if (xrpEl) xrpEl.textContent = `$${xrpPrice.toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4})}`;
        if (xrpTimeEl) xrpTimeEl.textContent = `Updated: ${treasuryFormatTimestamp(xrpTimestamp)}`;
        treasuryLastXrpPrice = xrpPrice;
        treasuryTriggerPulse(1);
    }
}

function treasuryUpdateCarbonDial(carbonAudit) {
    if (!carbonAudit) return;
    
    const intensity = carbonAudit.intensity || 0;
    const status = carbonAudit.status || 'Unknown';
    const region = carbonAudit.region || 'Oxford';
    const source = carbonAudit.data_source || 'FDC';
    
    const dialValueEl = document.getElementById('treasury-dial-value');
    const dialStatusEl = document.getElementById('treasury-dial-status');
    const regionEl = document.getElementById('treasury-carbon-region');
    const sourceEl = document.getElementById('treasury-carbon-source');
    const updateEl = document.getElementById('treasury-carbon-update');
    const dialEl = document.getElementById('treasury-carbon-dial');
    
    if (dialValueEl) dialValueEl.textContent = intensity;
    if (regionEl) regionEl.textContent = region;
    if (sourceEl) sourceEl.textContent = source;
    if (updateEl) updateEl.textContent = new Date().toLocaleTimeString();
    
    if (dialStatusEl) {
        dialStatusEl.textContent = `${status} Energy`;
        dialStatusEl.className = 'treasury-dial-status';
    }
    
    if (dialEl) {
        if (status === 'Green') {
            dialEl.style.setProperty('--green-angle', '180');
            dialEl.style.setProperty('--amber-angle', '180');
            if (dialStatusEl) dialStatusEl.classList.add('status-green');
        } else if (status === 'Amber') {
            dialEl.style.setProperty('--green-angle', '0');
            dialEl.style.setProperty('--amber-angle', '180');
            if (dialStatusEl) dialStatusEl.classList.add('status-amber');
        } else {
            dialEl.style.setProperty('--green-angle', '0');
            dialEl.style.setProperty('--amber-angle', '0');
            if (dialStatusEl) dialStatusEl.classList.add('status-red');
        }
    }
}

function treasuryUpdateFdcVerification(fdcStatus, carbonAudit) {
    if (!carbonAudit) return;
    
    const isFdcVerified = carbonAudit.is_fdc_verified || false;
    const status = carbonAudit.status || 'Unknown';
    const intensity = carbonAudit.intensity || 0;
    const fdcRoundId = carbonAudit.fdc_round_id;
    
    const badge = document.getElementById('treasury-fdc-badge');
    const statusText = document.getElementById('treasury-verification-status');
    const messageText = document.getElementById('treasury-verification-message');
    const iconEl = badge?.querySelector('.treasury-verification-icon');
    
    if (!badge) return;
    
    badge.className = 'treasury-fdc-badge';
    
    if (isFdcVerified && status === 'Green' && intensity < 50) {
        badge.classList.add('verified-green');
        if (statusText) statusText.textContent = '✅ STATE_GREEN_VERIFIED';
        if (messageText) messageText.textContent = `FDC consensus confirmed low carbon (Round: ${fdcRoundId || 'N/A'})`;
        if (iconEl) iconEl.textContent = '✅';
    } else if (isFdcVerified) {
        badge.classList.add('verified');
        if (statusText) statusText.textContent = '✓ FDC Verified';
        if (messageText) messageText.textContent = `Proof verified by Flare nodes (Round: ${fdcRoundId || 'N/A'})`;
        if (iconEl) iconEl.textContent = '✓';
    } else {
        badge.classList.add('unverified');
        if (statusText) statusText.textContent = '⏳ Waiting for Consensus';
        if (messageText) messageText.textContent = 'AI requires FDC proof verification before trading';
        if (iconEl) iconEl.textContent = '⏳';
    }
}

function treasuryTriggerPulse(index) {
    const items = document.querySelectorAll('.treasury-price-item');
    if (items[index]) {
        items[index].classList.remove('pulse');
        setTimeout(() => {
            items[index].classList.add('pulse');
        }, 10);
    }
}

function treasuryAddLogEntry(agent, message, timestamp = null) {
    const log = document.getElementById('treasury-ai-log');
    if (!log) return;
    
    const logTimestamp = timestamp || new Date().toLocaleTimeString();
    const agentNames = {
        'scout': 'Scout',
        'auditor': 'Auditor',
        'manager': 'Manager',
        'settlement': 'Settlement',
        'system': 'System'
    };
    
    // Determine log type based on message content and agent
    let logType = 'info';
    const msgLower = message.toLowerCase();
    
    if (msgLower.includes('error') || msgLower.includes('failed') || msgLower.includes('❌')) {
        logType = 'error';
    } else if (msgLower.includes('success') || msgLower.includes('✅') || msgLower.includes('complete')) {
        logType = 'success';
    } else if (msgLower.includes('warning') || msgLower.includes('⚠️') || msgLower.includes('wait') || msgLower.includes('decision')) {
        logType = 'warning';
    } else if (msgLower.includes('api') || msgLower.includes('fetch') || msgLower.includes('request') || msgLower.includes('get ') || msgLower.includes('post ')) {
        logType = 'api';
    } else if (agent === 'system') {
        logType = 'system';
    }
    
    // Map agent to icon (similar to Agent Terminal)
    const typeIcon = {
        'system': '⚡',
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌',
        'api': '📡'
    }[logType] || '•';
    
    const entry = document.createElement('div');
    entry.className = `terminal-log terminal-log-${logType}`;
    entry.innerHTML = `
        <span class="log-timestamp">[${logTimestamp}]</span>
        <span class="log-icon">${typeIcon}</span>
        <span class="log-message">[${agentNames[agent] || agent}] ${message}</span>
    `;
    
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
    
    // Keep only last 50 entries
    while (log.children.length > 50) {
        log.removeChild(log.firstChild);
    }
}

function treasuryFormatTimestamp(timestamp) {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
}

function treasuryUpdateAgentStatus(running) {
    const statusDot = document.getElementById('treasury-status-dot');
    const statusText = document.getElementById('treasury-status-text');
    const startBtn = document.getElementById('treasury-start-btn');
    const stopBtn = document.getElementById('treasury-stop-btn');
    
    if (statusDot && statusText) {
        if (running) {
            statusDot.classList.add('running');
            statusDot.classList.remove('stopped');
            statusText.textContent = 'Running';
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
        } else {
            statusDot.classList.remove('running');
            statusDot.classList.add('stopped');
            statusText.textContent = 'Stopped';
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
        }
    }
}

async function treasuryStartAgents() {
    const btn = document.getElementById('treasury-start-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Starting...';
    }
    
    try {
        const response = await fetch('/api/agents/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.status === 'success' || data.status === 'already_running') {
            treasuryUpdateAgentStatus(true);
            treasuryAddLogEntry('system', 'Agents started - Resuming data collection');
            addAgentTerminalLog(`✅ ${data.message || 'Agents started successfully'}`, 'success');
            updateAgentStatus();
            setTimeout(() => fetchAgentLogs(true), 500);
        } else {
            addAgentTerminalLog(`⚠️ ${data.message || 'Agents may already be running'}`, 'warning');
            updateAgentStatus();
        }
    } catch (error) {
        console.error('Error starting agents:', error);
        treasuryAddLogEntry('system', `Error starting agents: ${error.message}`);
        addAgentTerminalLog(`❌ Error starting agents: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '▶️ START AGENTS';
        }
    }
}

async function treasuryStopAgents() {
    const btn = document.getElementById('treasury-stop-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Stopping...';
    }
    
    try {
        const response = await fetch('/api/agents/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.status === 'success' || data.status === 'already_stopped') {
            treasuryUpdateAgentStatus(false);
            treasuryAddLogEntry('system', 'Agents stopped - Data collection paused');
            addAgentTerminalLog(`⏸️ ${data.message || 'Agents stopped successfully'}`, 'warning');
            updateAgentStatus();
            setTimeout(() => fetchAgentLogs(true), 500);
        } else {
            addAgentTerminalLog(`⚠️ ${data.message || 'Agents may already be stopped'}`, 'warning');
            updateAgentStatus();
        }
    } catch (error) {
        console.error('Error stopping agents:', error);
        treasuryAddLogEntry('system', `Error stopping agents: ${error.message}`);
        addAgentTerminalLog(`❌ Error stopping agents: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '⏸️ Stop Agents';
        }
    }
}

// Developer Panel Functions
let developerPanelOpen = false;
let agentLogsInterval = null;
let lastLogCount = 0;
let agentLogsCache = [];

function initializeDeveloperPanel() {
    // Use the treasury buttons (they're the same now)
    const startAgentsBtn = document.getElementById('treasury-start-btn');
    const stopAgentsBtn = document.getElementById('treasury-stop-btn');
    const clearTerminalBtn = document.getElementById('clear-terminal-btn');
    
    // Initialize developer terminal (now part of Green Treasury)
    if (state.currentTab === 'developer-green-treasury') {
        updateAgentStatus();
        fetchAgentLogs(true); // Initial load with all logs
        startAgentLogsPolling();
    }
    
    // Note: Start/Stop buttons are handled by onclick handlers in HTML (treasuryStartAgents/treasuryStopAgents)
    // But we can also add event listeners for the terminal logging
    
    // Clear terminal button
    if (clearTerminalBtn) {
        clearTerminalBtn.addEventListener('click', () => {
            const terminalContent = document.getElementById('agent-terminal-content');
            if (terminalContent) {
                terminalContent.innerHTML = '';
                lastLogCount = 0;
                agentLogsCache = [];
                addAgentTerminalLog('Terminal cleared', 'system');
            }
        });
    }
}

async function updateAgentStatus() {
    try {
        const response = await fetch('/api/agents/status');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        // Update both treasury status and developer status (they're the same now)
        const statusDot = document.getElementById('treasury-status-dot');
        const statusText = document.getElementById('treasury-status-text');
        const startAgentsBtn = document.getElementById('treasury-start-btn');
        const stopAgentsBtn = document.getElementById('treasury-stop-btn');
        
        if (statusDot && statusText) {
            if (result.agents_running) {
                statusDot.classList.add('running');
                statusDot.classList.remove('stopped');
                statusText.textContent = 'Running';
                if (startAgentsBtn) startAgentsBtn.disabled = true;
                if (stopAgentsBtn) stopAgentsBtn.disabled = false;
            } else {
                statusDot.classList.remove('running');
                statusDot.classList.add('stopped');
                statusText.textContent = 'Stopped';
                if (startAgentsBtn) startAgentsBtn.disabled = false;
                if (stopAgentsBtn) stopAgentsBtn.disabled = true;
            }
        }
        
        // Also update treasury status function
        treasuryUpdateAgentStatus(result.agents_running);
    } catch (error) {
        console.error('Error updating agent status:', error);
        const statusText = document.getElementById('treasury-status-text');
        if (statusText) {
            statusText.textContent = 'Error';
        }
    }
}

function startAgentLogsPolling() {
    if (agentLogsInterval) {
        clearInterval(agentLogsInterval);
    }
    
    // Poll every 1 second for real-time updates
    agentLogsInterval = setInterval(() => {
        if (state.currentTab === 'developer-green-treasury') {
            fetchAgentLogs(false); // Incremental updates
            updateAgentStatus();
        }
    }, 1000); // Faster polling for better real-time feel
}

function stopAgentLogsPolling() {
    if (agentLogsInterval) {
        clearInterval(agentLogsInterval);
        agentLogsInterval = null;
    }
}

async function fetchAgentLogs(showAll = false) {
    try {
        // Use dedicated agent-logs endpoint for better real-time updates
        const response = await fetch('/api/agent-logs');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const terminalContent = document.getElementById('agent-terminal-content');
        if (!terminalContent) return;
        
        // Only update if we're on the developer-green-treasury tab
        if (state.currentTab !== 'developer-green-treasury') return;
        
        if (data.agent_logs && Array.isArray(data.agent_logs)) {
            if (showAll) {
                // Show all logs (initial load or after clear)
                terminalContent.innerHTML = '';
                lastLogCount = 0;
                agentLogsCache = [];
                
                data.agent_logs.forEach(log => {
                    addAgentTerminalLog(
                        `[${log.agent}] ${log.message}`,
                        getLogType(log.message),
                        log.timestamp
                    );
                    agentLogsCache.push(log);
                });
                lastLogCount = data.agent_logs.length;
            } else {
                // Only show new logs (incremental updates)
                const currentLogCount = data.agent_logs.length;
                
                if (currentLogCount > lastLogCount) {
                    const newLogs = data.agent_logs.slice(lastLogCount);
                    
                    newLogs.forEach(log => {
                        // Check if we've already shown this log (by comparing all fields)
                        const isDuplicate = agentLogsCache.some(cached => 
                            cached.timestamp === log.timestamp && 
                            cached.agent === log.agent && 
                            cached.message === log.message
                        );
                        
                        if (!isDuplicate) {
                            addAgentTerminalLog(
                                `[${log.agent}] ${log.message}`,
                                getLogType(log.message),
                                log.timestamp
                            );
                            agentLogsCache.push(log);
                        }
                    });
                    
                    // Update cache to match server state (keep last 500 for deduplication)
                    if (agentLogsCache.length > 500) {
                        agentLogsCache = agentLogsCache.slice(-500);
                    }
                    
                    lastLogCount = currentLogCount;
                } else if (currentLogCount < lastLogCount) {
                    // Logs were cleared on server, reset
                    lastLogCount = 0;
                    agentLogsCache = [];
                }
            }
        }
    } catch (error) {
        console.error('Error fetching agent logs:', error);
        // Show error in terminal only if it's empty
        if (state.currentTab === 'developer-green-treasury') {
            const terminalContent = document.getElementById('agent-terminal-content');
            if (terminalContent && terminalContent.children.length === 0) {
                addAgentTerminalLog(`❌ Error connecting to server: ${error.message}`, 'error');
            }
        }
    }
}

function getLogType(message) {
    const msg = message.toLowerCase();
    if (msg.includes('error') || msg.includes('failed') || msg.includes('❌')) {
        return 'error';
    }
    if (msg.includes('success') || msg.includes('✅') || msg.includes('complete')) {
        return 'success';
    }
    if (msg.includes('warning') || msg.includes('⚠️') || msg.includes('wait')) {
        return 'warning';
    }
    if (msg.includes('api') || msg.includes('fetch') || msg.includes('request')) {
        return 'api';
    }
    return 'info';
}

function addAgentTerminalLog(message, type = 'info', timestamp = null) {
    const terminalContent = document.getElementById('agent-terminal-content');
    if (!terminalContent) return;
    
    // Use provided timestamp or current time
    const timeStr = timestamp || new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `terminal-log terminal-log-${type}`;
    
    const typeIcon = {
        'system': '⚡',
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌',
        'api': '📡'
    }[type] || '•';
    
    logEntry.innerHTML = `<span class="log-timestamp">[${timeStr}]</span> <span class="log-icon">${typeIcon}</span> <span class="log-message">${message}</span>`;
    
    terminalContent.appendChild(logEntry);
    
    // Auto-scroll to bottom (only if user is near bottom)
    const isNearBottom = terminalContent.scrollHeight - terminalContent.scrollTop - terminalContent.clientHeight < 100;
    if (isNearBottom) {
        requestAnimationFrame(() => {
            terminalContent.scrollTop = terminalContent.scrollHeight;
        });
    }
    
    // Limit terminal size to prevent memory issues (keep last 500 logs)
    while (terminalContent.children.length > 500) {
        terminalContent.removeChild(terminalContent.firstChild);
    }
}

// Tutorial and Authentication Functions
function checkAuthAndTutorial() {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const tutorialShown = localStorage.getItem('tutorialShown') === 'true';
    
    // Check URL parameter for tutorial flag
    const urlParams = new URLSearchParams(window.location.search);
    const showTutorial = urlParams.get('tutorial') === 'true';
    
    // If not logged in, redirect to login page
    if (!isLoggedIn && !showTutorial) {
        // Don't redirect if already on login page or landing page
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login.html') && !currentPath.includes('index.html')) {
            window.location.href = 'login.html';
            return;
        }
    }
    
    // Show/hide logout button based on login status
    const logoutBtn = document.getElementById('logout-btn');
    const menuLogout = document.getElementById('menu-logout');
    
    if (logoutBtn) {
        if (isLoggedIn) {
            logoutBtn.style.display = 'block';
        } else {
            logoutBtn.style.display = 'none';
        }
    }
    
    // Show/hide logout in menu
    if (menuLogout) {
        if (isLoggedIn) {
            menuLogout.style.display = 'flex';
        } else {
            menuLogout.style.display = 'none';
        }
    }
    
    // Hide main application content if tutorial should be shown
    if (showTutorial && !tutorialShown) {
        // Hide navbar and main content immediately
        const navbar = document.querySelector('.navbar');
        const mainContent = document.querySelector('main');
        
        if (navbar) {
            navbar.style.display = 'none';
        }
        if (mainContent) {
            mainContent.style.display = 'none';
        }
        
        // Initialize tutorial
        initializeTutorial();
    } else {
        // Show main content if no tutorial
        const navbar = document.querySelector('.navbar');
        const mainContent = document.querySelector('main');
        
        if (navbar) {
            navbar.style.display = '';
        }
        if (mainContent) {
            mainContent.style.display = '';
        }
    }
}

function initializeTutorial() {
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    const tutorialSlidesContainer = document.getElementById('tutorial-slides-container');
    const tutorialSlides = document.querySelectorAll('.tutorial-slide');
    const tutorialDots = document.querySelectorAll('.tutorial-dot');
    const finishBtn = document.getElementById('tutorial-finish');
    const arrowLeft = document.getElementById('tutorial-arrow-left');
    const arrowRight = document.getElementById('tutorial-arrow-right');
    
    if (!tutorialOverlay || !tutorialSlidesContainer) {
        console.warn('Tutorial elements not found');
        return;
    }
    
    const totalSlides = tutorialSlides.length;
    
    // Ensure main content is hidden (should already be hidden, but double-check)
    const mainContent = document.querySelector('main');
    const navbar = document.querySelector('.navbar');
    
    if (mainContent) {
        mainContent.style.display = 'none';
    }
    if (navbar) {
        navbar.style.display = 'none';
    }
    
    // Show tutorial overlay with smooth animation
    setTimeout(() => {
        tutorialOverlay.classList.add('show');
        
        // Animate slides in
        tutorialSlides.forEach((slide, index) => {
            slide.style.opacity = '0';
            slide.style.transform = 'translateX(20px)';
            slide.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
            
            setTimeout(() => {
                slide.style.opacity = '1';
                slide.style.transform = 'translateX(0)';
            }, 100);
        });
        
        // Animate dots in
        tutorialDots.forEach((dot, index) => {
            dot.style.opacity = '0';
            dot.style.transform = 'scale(0)';
            dot.style.transition = `opacity 0.4s ease ${0.8 + index * 0.1}s, transform 0.4s ease ${0.8 + index * 0.1}s`;
            
            setTimeout(() => {
                dot.style.opacity = '1';
                dot.style.transform = 'scale(1)';
            }, 800 + index * 100);
        });
        
        // Animate arrows in
        if (arrowLeft) {
            arrowLeft.style.opacity = '0';
            arrowLeft.style.transform = 'translateX(-20px)';
            arrowLeft.style.transition = 'opacity 0.5s ease 0.5s, transform 0.5s ease 0.5s';
            setTimeout(() => {
                arrowLeft.style.opacity = '0.7';
                arrowLeft.style.transform = 'translateX(0)';
            }, 500);
        }
        
        if (arrowRight) {
            arrowRight.style.opacity = '0';
            arrowRight.style.transform = 'translateX(20px)';
            arrowRight.style.transition = 'opacity 0.5s ease 0.5s, transform 0.5s ease 0.5s';
            setTimeout(() => {
                arrowRight.style.opacity = '0.7';
                arrowRight.style.transform = 'translateX(0)';
            }, 500);
        }
    }, 400);
    
    // Scroll to left to ensure first slide is visible
    tutorialSlidesContainer.scrollLeft = 0;
    
    // Function to get current slide index
    function getCurrentSlideIndex() {
        const scrollPosition = tutorialSlidesContainer.scrollLeft;
        const viewportWidth = tutorialSlidesContainer.clientWidth;
        return Math.round(scrollPosition / viewportWidth);
    }
    
    // Function to scroll to a specific slide
    function scrollToSlide(index) {
        if (index >= 0 && index < totalSlides) {
            const slide = tutorialSlides[index];
            if (slide) {
                slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            }
        }
    }
    
    // Function to update active dot and arrow states based on scroll position
    function updateNavigation() {
        const currentSlideIndex = getCurrentSlideIndex();
        
        // Update dots
        tutorialDots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlideIndex);
        });
        
        // Update arrow states
        if (arrowLeft) {
            arrowLeft.disabled = currentSlideIndex === 0;
        }
        if (arrowRight) {
            arrowRight.disabled = currentSlideIndex === totalSlides - 1;
        }
    }
    
    // Handle scroll events to update navigation
    let scrollTimeout;
    tutorialSlidesContainer.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateNavigation, 100);
    });
    
    // Arrow navigation
    if (arrowLeft) {
        arrowLeft.addEventListener('click', () => {
            const currentIndex = getCurrentSlideIndex();
            if (currentIndex > 0) {
                scrollToSlide(currentIndex - 1);
            }
        });
    }
    
    if (arrowRight) {
        arrowRight.addEventListener('click', () => {
            const currentIndex = getCurrentSlideIndex();
            if (currentIndex < totalSlides - 1) {
                scrollToSlide(currentIndex + 1);
            }
        });
    }
    
    // Update navigation on initial load
    updateNavigation();
    
    // Dot navigation - scroll to slide when clicked
    tutorialDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            scrollToSlide(index);
        });
    });
    
    // Finish tutorial button
    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            localStorage.setItem('tutorialShown', 'true');
            
            // Fade out tutorial
            tutorialOverlay.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            tutorialOverlay.style.opacity = '0';
            tutorialOverlay.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                tutorialOverlay.classList.remove('show');
                
                // Show main application with fade in
                const navbar = document.querySelector('.navbar');
                const mainContent = document.querySelector('main');
                
                if (navbar) {
                    navbar.style.display = '';
                    navbar.style.opacity = '0';
                    navbar.style.transition = 'opacity 0.6s ease';
                    setTimeout(() => {
                        navbar.style.opacity = '1';
                    }, 50);
                }
                
                if (mainContent) {
                    mainContent.style.display = '';
                    mainContent.style.opacity = '0';
                    mainContent.style.transition = 'opacity 0.6s ease';
                    setTimeout(() => {
                        mainContent.style.opacity = '1';
                    }, 50);
                }
                
                // Remove tutorial parameter from URL
                const url = new URL(window.location);
                url.searchParams.delete('tutorial');
                window.history.replaceState({}, '', url);
                
                // Show logout button after tutorial
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.style.display = 'block';
                }
                const menuLogout = document.getElementById('menu-logout');
                if (menuLogout) {
                    menuLogout.style.display = 'flex';
                }
            }, 500);
        });
    }
    
    // Keyboard navigation (arrow keys)
    document.addEventListener('keydown', (e) => {
        if (!tutorialOverlay.classList.contains('show')) return;
        
        if (e.key === 'ArrowLeft') {
            const currentIndex = getCurrentSlideIndex();
            if (currentIndex > 0) {
                scrollToSlide(currentIndex - 1);
            }
        } else if (e.key === 'ArrowRight') {
            const currentIndex = getCurrentSlideIndex();
            if (currentIndex < totalSlides - 1) {
                scrollToSlide(currentIndex + 1);
            }
        }
    });
    
    // Prevent body scroll when tutorial is active
    document.body.style.overflow = 'hidden';
    
    // Re-enable body scroll when tutorial is closed
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (!tutorialOverlay.classList.contains('show')) {
                document.body.style.overflow = '';
                observer.disconnect();
            }
        });
    });
    
    observer.observe(tutorialOverlay, {
        attributes: true,
        attributeFilter: ['class']
    });
}

// Logout function
function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('tutorialShown');
        window.location.href = 'index.html';
    }
}

