const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Track file modification times for auto-reload
const fileTimestamps = new Map();
function getFileTimestamp(file) {
    try {
        return fs.statSync(file).mtime.getTime();
    } catch {
        return 0;
    }
}

// Auto-reload endpoint - checks if files have changed
app.get('/api/reload-check', (req, res) => {
    const files = ['index.html', 'app.js', 'style.css'];
    const changes = {};
    let hasChanges = false;

    files.forEach(file => {
        const filePath = path.join(__dirname, file);
        const currentTime = getFileTimestamp(filePath);
        const lastTime = fileTimestamps.get(file) || 0;

        if (currentTime !== lastTime && lastTime !== 0) {
            changes[file] = true;
            hasChanges = true;
        }
        fileTimestamps.set(file, currentTime);
    });

    res.json({ reload: hasChanges, changes });
});

// In-memory data store (memory efficient)
class DataStore {
    constructor() {
        this.companies = this.generateCompanies();
        this.users = new Map();
        this.marketData = {
            totalCredits: 0,
            globalCO2: 420,
            activeCompanies: 0,
            marketCap: 0,
            lastUpdate: Date.now()
        };
        this.updateMarketData();
    }

    generateCompanies() {
        const industries = ['Tech', 'Manufacturing', 'Energy', 'Transport', 'Agriculture'];
        const companyNames = [
            'ACME Corporation', 'TechGlobal Industries', 'Green Energy Solutions', 'Manufacturing Co Ltd',
            'Solar Power Systems', 'Wind Energy Group', 'EcoTech Innovations', 'Sustainable Materials Inc',
            'Carbon Neutral Corp', 'Renewable Resources Ltd', 'Clean Transport Solutions', 'AgriTech Ventures',
            'Ocean Cleanup Initiative', 'Forest Restoration Co', 'Hydrogen Energy Systems', 'Battery Storage Solutions',
            'Smart Grid Technologies', 'Waste Management Plus', 'Water Conservation Systems', 'Biofuel Industries',
            'Electric Vehicle Motors', 'Solar Panel Manufacturing', 'Wind Turbine Systems', 'Geothermal Energy Co',
            'Carbon Capture Tech', 'Green Building Materials', 'Sustainable Agriculture', 'Eco-Friendly Packaging',
            'Renewable Energy Partners', 'Climate Action Group', 'Zero Waste Solutions', 'Clean Air Technologies',
            'Sustainable Logistics', 'Green Infrastructure Co', 'Eco Manufacturing', 'Renewable Power Systems',
            'Carbon Offset Solutions', 'Sustainable Development Corp', 'Green Innovation Labs', 'Clean Energy Ventures',
            'Eco-Friendly Transport', 'Sustainable Supply Chain', 'Green Technology Group', 'Renewable Resources Inc',
            'Climate Solutions Ltd', 'Eco Systems International', 'Sustainable Energy Co', 'Green Future Industries',
            'Clean Technology Corp', 'Renewable Energy Systems', 'Sustainable Solutions Group', 'Eco Power Industries'
        ];
        const companies = [];

        for (let i = 0; i < 50; i++) {
            const credits = Math.floor(Math.random() * 10000) + 1000;
            const hasDebt = Math.random() > 0.7;
            const previousCredits = Math.floor(Math.random() * 5000);
            
            companies.push({
                id: i + 1,
                name: companyNames[i % companyNames.length] + (i >= companyNames.length ? ` ${Math.floor(i / companyNames.length) + 1}` : ''),
                credits: credits,
                debt: hasDebt ? Math.floor(Math.random() * 5000) : 0,
                industry: industries[Math.floor(Math.random() * industries.length)],
                totalInvestment: Math.floor(Math.random() * 2000000) + 100000,
                previousCredits: previousCredits,
                co2Reduction: (Math.random() * 30 + 5).toFixed(2),
                sharePrice: (Math.random() * 100 + 10).toFixed(2),
                investors: []
            });
        }

        return companies;
    }

    updateMarketData() {
        this.marketData.totalCredits = this.companies.reduce((sum, c) => sum + c.credits, 0);
        this.marketData.globalCO2 = 420 + (Math.random() * 10 - 5);
        this.marketData.activeCompanies = this.companies.length;
        this.marketData.marketCap = this.companies.reduce((sum, c) => sum + c.totalInvestment, 0);
        this.marketData.lastUpdate = Date.now();
    }

    getUser(userId = 'default') {
        if (!this.users.has(userId)) {
            this.users.set(userId, {
                id: userId,
                credits: 0,
                balance: 10000,
                holdings: [],
                contracts: [],
                incomeHistory: []
            });
        }
        return this.users.get(userId);
    }

    updateUser(userId, userData) {
        this.users.set(userId, { ...this.getUser(userId), ...userData });
    }
}

const dataStore = new DataStore();

// Update market data periodically
setInterval(() => {
    // Simulate market changes
    dataStore.companies.forEach(company => {
        const change = (Math.random() - 0.5) * 0.1; // ±5% change
        company.credits = Math.max(0, Math.floor(company.credits * (1 + change)));
        company.sharePrice = Math.max(1, parseFloat(company.sharePrice) * (1 + change * 0.1)).toFixed(2);
    });
    dataStore.updateMarketData();
}, 30000); // Update every 30 seconds

// API Routes

// Get all companies
app.get('/api/companies', (req, res) => {
    res.json(dataStore.companies);
});

// Get single company
app.get('/api/companies/:id', (req, res) => {
    const company = dataStore.companies.find(c => c.id === parseInt(req.params.id));
    if (company) {
        res.json(company);
    } else {
        res.status(404).json({ error: 'Company not found' });
    }
});

// Get market data
app.get('/api/market', (req, res) => {
    dataStore.updateMarketData();
    res.json(dataStore.marketData);
});

// Get user data
app.get('/api/user', (req, res) => {
    const userId = req.query.userId || 'default';
    const user = dataStore.getUser(userId);
    res.json(user);
});

// Investment endpoint
app.post('/api/invest', (req, res) => {
    const { companyId, amount, userId = 'default' } = req.body;

    if (!companyId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid investment data' });
    }

    const company = dataStore.companies.find(c => c.id === companyId);
    if (!company) {
        return res.status(404).json({ error: 'Company not found' });
    }

    const user = dataStore.getUser(userId);
    if (user.balance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Calculate share
    const share = (amount / company.totalInvestment) * 100;
    
    // Update company
    company.totalInvestment += amount;
    company.investors.push({
        userId: userId,
        amount: amount,
        share: share
    });

    // Update user
    user.balance -= amount;
    const existingHolding = user.holdings.find(h => h.companyId === companyId);
    
    if (existingHolding) {
        existingHolding.amount += amount;
        existingHolding.share = (existingHolding.amount / company.totalInvestment) * 100;
    } else {
        user.holdings.push({
            companyId: companyId,
            companyName: company.name,
            amount: amount,
            share: share,
            credits: 0
        });
    }

    dataStore.updateUser(userId, user);

    res.json({
        success: true,
        share: share.toFixed(2),
        newBalance: user.balance
    });
});

// Distribute carbon credits (simulate periodic distribution)
app.post('/api/distribute-credits', (req, res) => {
    const userId = req.query.userId || 'default';
    const user = dataStore.getUser(userId);

    // Distribute credits based on holdings
    user.holdings.forEach(holding => {
        const company = dataStore.companies.find(c => c.id === holding.companyId);
        if (company && company.credits > 0) {
            const creditsEarned = Math.floor(company.credits * (holding.share / 100));
            holding.credits += creditsEarned;
            user.credits += creditsEarned;

            // Add to income history
            user.incomeHistory.push({
                source: `Carbon Credits from ${holding.companyName}`,
                amount: creditsEarned * 10, // Assume 1 CC = $10
                date: new Date().toISOString(),
                type: 'credits'
            });
        }
    });

    dataStore.updateUser(userId, user);

    res.json({
        success: true,
        credits: user.credits,
        holdings: user.holdings
    });
});

// Get leaderboard data
app.get('/api/leaderboard/:type', (req, res) => {
    const { type } = req.params;
    let companies = [...dataStore.companies];

    switch (type) {
        case 'top-performers':
            companies.sort((a, b) => b.credits - a.credits);
            break;
        case 'worst-performers':
            companies = companies.filter(c => c.debt > 0);
            companies.sort((a, b) => b.debt - a.debt);
            break;
        case 'best-comparative':
            const avgCredits = companies.reduce((sum, c) => sum + c.credits, 0) / companies.length;
            companies.forEach(c => {
                c.comparative = c.credits - avgCredits;
            });
            companies.sort((a, b) => b.comparative - a.comparative);
            break;
        case 'turnarounds':
            companies.forEach(c => {
                c.turnaround = c.credits - c.previousCredits;
            });
            companies.sort((a, b) => b.turnaround - a.turnaround);
            break;
        case 'growth':
            companies.forEach(c => {
                c.growthRate = c.previousCredits > 0 
                    ? ((c.credits - c.previousCredits) / c.previousCredits * 100).toFixed(2)
                    : 0;
            });
            companies.sort((a, b) => b.growthRate - a.growthRate);
            break;
    }

    res.json(companies.slice(0, 20));
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`VeridiFi server running on http://localhost:${PORT}`);
    console.log(`Market data initialized with ${dataStore.companies.length} companies`);
});

