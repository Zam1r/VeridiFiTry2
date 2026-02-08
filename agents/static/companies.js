/**
 * Company Data Module
 * 
 * Contains company information including locations and sites
 * This data structure is ready for integration with your company database
 */

const COMPANIES = [
    {
        id: 'acme-corp',
        name: 'ACME Corporation',
        headquarters: {
            name: 'ACME HQ',
            latitude: 40.7128,
            longitude: -74.0060, // New York
            address: 'New York, NY, USA'
        },
        sites: [
            {
                id: 'acme-nyc',
                name: 'ACME New York Office',
                location: { latitude: 40.7128, longitude: -74.0060 },
                targetEmissions: 400
            },
            {
                id: 'acme-la',
                name: 'ACME Los Angeles Facility',
                location: { latitude: 34.0522, longitude: -118.2437 },
                targetEmissions: 450
            },
            {
                id: 'acme-chicago',
                name: 'ACME Chicago Plant',
                location: { latitude: 41.8781, longitude: -87.6298 },
                targetEmissions: 500
            }
        ],
        carbonGoal: {
            target: 1200, // Total CO2e target
            deadline: '2025-12-31',
            current: 1350
        }
    },
    {
        id: 'tech-global',
        name: 'TechGlobal Industries',
        headquarters: {
            name: 'TechGlobal HQ',
            latitude: 51.5074,
            longitude: -0.1278, // London
            address: 'London, UK'
        },
        sites: [
            {
                id: 'tech-london',
                name: 'TechGlobal London Office',
                location: { latitude: 51.5074, longitude: -0.1278 },
                targetEmissions: 350
            },
            {
                id: 'tech-paris',
                name: 'TechGlobal Paris Facility',
                location: { latitude: 48.8566, longitude: 2.3522 },
                targetEmissions: 380
            },
            {
                id: 'tech-berlin',
                name: 'TechGlobal Berlin Data Center',
                location: { latitude: 52.5200, longitude: 13.4050 },
                targetEmissions: 420
            }
        ],
        carbonGoal: {
            target: 1000,
            deadline: '2026-06-30',
            current: 1150
        }
    },
    {
        id: 'green-energy',
        name: 'Green Energy Solutions',
        headquarters: {
            name: 'Green Energy HQ',
            latitude: 37.7749,
            longitude: -122.4194, // San Francisco
            address: 'San Francisco, CA, USA'
        },
        sites: [
            {
                id: 'green-sf',
                name: 'Green Energy SF Headquarters',
                location: { latitude: 37.7749, longitude: -122.4194 },
                targetEmissions: 300
            },
            {
                id: 'green-seattle',
                name: 'Green Energy Seattle Office',
                location: { latitude: 47.6062, longitude: -122.3321 },
                targetEmissions: 320
            }
        ],
        carbonGoal: {
            target: 600,
            deadline: '2025-12-31',
            current: 620
        }
    },
    {
        id: 'manufacturing-co',
        name: 'Manufacturing Co Ltd',
        headquarters: {
            name: 'Manufacturing HQ',
            latitude: 35.6762,
            longitude: 139.6503, // Tokyo
            address: 'Tokyo, Japan'
        },
        sites: [
            {
                id: 'mfg-tokyo',
                name: 'Manufacturing Tokyo Plant',
                location: { latitude: 35.6762, longitude: 139.6503 },
                targetEmissions: 600
            },
            {
                id: 'mfg-osaka',
                name: 'Manufacturing Osaka Facility',
                location: { latitude: 34.6937, longitude: 135.5023 },
                targetEmissions: 550
            },
            {
                id: 'mfg-nagoya',
                name: 'Manufacturing Nagoya Warehouse',
                location: { latitude: 35.1815, longitude: 136.9066 },
                targetEmissions: 400
            }
        ],
        carbonGoal: {
            target: 1500,
            deadline: '2026-12-31',
            current: 1550
        }
    }
];

/**
 * Get company by ID
 */
function getCompanyById(companyId) {
    return COMPANIES.find(c => c.id === companyId);
}

/**
 * Get all companies
 */
function getAllCompanies() {
    return COMPANIES;
}

/**
 * Get company sites
 */
function getCompanySites(companyId) {
    const company = getCompanyById(companyId);
    return company ? company.sites : [];
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { COMPANIES, getCompanyById, getAllCompanies, getCompanySites };
}

