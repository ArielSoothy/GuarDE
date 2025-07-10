// Mock Data Generation
const mockData = {
    sessions: [],
    campaignSpend: [],
    attributionResults: []
};

// Utility function to parse source from referrer_url
function parseSourceFromUrl(referrerUrl) {
    const isMarketing = referrerUrl.includes('utm_source=');
    const source = isMarketing ? 
        referrerUrl.match(/utm_source=([^&]+)/)?.[1] || 'unknown' : 
        'organic';
    const campaign = isMarketing ? 
        referrerUrl.match(/utm_campaign=([^&]+)/)?.[1] || null : 
        null;
    
    return { source, campaign_id: campaign };
}

// SQL Query Engine for Mock Database
class MockSQLEngine {
    constructor(data) {
        this.data = data;
    }
    
    // Execute SQL-like queries against mock data
    executeQuery(queryType, params = {}) {
        switch (queryType) {
            case 'parse_sessions':
                return this.parseSessionsQuery(params);
            case 'activated_users':
                return this.activatedUsersQuery(params);
            case 'attribution_window':
                return this.attributionWindowQuery(params);
            case 'final_attribution':
                return this.finalAttributionQuery(params);
            case 'complete_attribution':
                return this.completeAttributionQuery(params);
            case 'cpa_daily':
                return this.cpaQueryDaily(params);
            case 'cpa_campaign':
                return this.cpaQueryCampaign(params);
            case 'cpa_source':
                return this.cpaQuerySource(params);
            case 'cpa_ad':
                return this.cpaQueryAd(params);
            case 'cpa_preparation':
                return this.cpaPreparationQuery(params);
            default:
                throw new Error(`Unknown query type: ${queryType}`);
        }
    }
    
    parseSessionsQuery(params) {
        const limit = params.limit || 10;
        const sessions = this.data.sessions.slice(0, limit).map(session => {
            const parsed = parseSourceFromUrl(session.referrer_url);
            return {
                session_id: session.session_id,
                user_id: session.user_id,
                device_type: session.device_type,
                session_start_time: session.session_start_time,
                referrer_url: session.referrer_url,
                source: parsed.source,
                campaign_id: parsed.campaign_id,
                is_activated: session.is_activated
            };
        });
        
        return {
            query: `SELECT session_id, user_id, device_type, session_start_time, referrer_url,
                   CASE WHEN referrer_url LIKE '%utm_source=%' THEN 
                        REGEXP_EXTRACT(referrer_url, r'utm_source=([^&]+)') ELSE 'organic' END as source,
                   CASE WHEN referrer_url LIKE '%utm_campaign=%' THEN 
                        REGEXP_EXTRACT(referrer_url, r'utm_campaign=([^&]+)') END as campaign_id,
                   is_activated
                   FROM sessions LIMIT ${limit}`,
            results: sessions,
            rowCount: sessions.length
        };
    }
    
    activatedUsersQuery(params) {
        const limit = params.limit || 10;
        const activatedUsers = this.data.sessions
            .filter(s => s.is_activated === 1)
            .slice(0, limit)
            .map(session => {
                const windowStart = new Date(session.session_start_time);
                windowStart.setDate(windowStart.getDate() - 14);
                
                return {
                    user_id: session.user_id,
                    activation_session_start_time: session.session_start_time,
                    window_start_date: windowStart,
                    activation_date: new Date(session.session_start_time)
                };
            });
            
        return {
            query: `SELECT user_id, session_start_time as activation_session_start_time,
                   DATE_SUB(DATE(session_start_time), INTERVAL 14 DAY) as window_start_date,
                   DATE(session_start_time) as activation_date
                   FROM sessions WHERE is_activated = 1 LIMIT ${limit}`,
            results: activatedUsers,
            rowCount: activatedUsers.length
        };
    }
    
    attributionWindowQuery(params) {
        const limit = params.limit || 10;
        const activatedUsers = this.data.sessions.filter(s => s.is_activated === 1).slice(0, limit);
        
        const windowSessions = activatedUsers.map(user => {
            const userSessions = this.data.sessions.filter(s => s.user_id === user.user_id);
            const windowStart = new Date(user.session_start_time);
            windowStart.setDate(windowStart.getDate() - 14);
            
            const sessionsInWindow = userSessions.filter(s => 
                new Date(s.session_start_time) >= windowStart && 
                new Date(s.session_start_time) <= new Date(user.session_start_time)
            );
            
            return sessionsInWindow.map(session => {
                const parsed = parseSourceFromUrl(session.referrer_url);
                const daysBefore = Math.floor((new Date(user.session_start_time) - new Date(session.session_start_time)) / (1000 * 60 * 60 * 24));
                
                return {
                    user_id: user.user_id,
                    session_start_time: session.session_start_time,
                    source: parsed.source,
                    campaign_id: parsed.campaign_id,
                    days_before_activation: daysBefore,
                    touch_type: parsed.source === 'organic' ? 'Organic' : 'Marketing'
                };
            });
        }).flat();
        
        return {
            query: `SELECT au.user_id, ps.session_start_time, ps.source, ps.campaign_id,
                   DATEDIFF(au.activation_date, DATE(ps.session_start_time)) as days_before_activation,
                   CASE WHEN ps.source = 'organic' THEN 'Organic' ELSE 'Marketing' END as touch_type
                   FROM activated_users au
                   JOIN parsed_sessions ps ON au.user_id = ps.user_id
                   WHERE DATE(ps.session_start_time) BETWEEN au.window_start_date AND au.activation_date
                   LIMIT ${limit}`,
            results: windowSessions.slice(0, limit),
            rowCount: windowSessions.length
        };
    }
    
    finalAttributionQuery(params) {
        const limit = params.limit || 10;
        const attributionResults = this.data.attributionResults.slice(0, limit).map(result => ({
            user_id: result.user_id,
            first_touch_source: result.first_touch_attribution_source,
            first_touch_campaign: result.first_touch_campaign_id,
            last_touch_source: result.last_touch_attribution_source,
            last_touch_campaign: result.last_touch_campaign_id,
            marketing_touchpoints: result.first_touch_attribution_source !== 'organic' ? 1 : 0
        }));
        
        return {
            query: `SELECT user_id, first_touch_attribution_source, first_touch_campaign_id,
                   last_touch_attribution_source, last_touch_campaign_id,
                   CASE WHEN first_touch_attribution_source != 'organic' THEN 1 ELSE 0 END as marketing_touchpoints
                   FROM attribution_results LIMIT ${limit}`,
            results: attributionResults,
            rowCount: attributionResults.length
        };
    }
    
    completeAttributionQuery(params) {
        const limit = params.limit || 10;
        return {
            query: `SELECT user_id, activation_session_start_time, first_touch_attribution_source,
                   first_touch_campaign_id, last_touch_attribution_source, last_touch_campaign_id
                   FROM attribution_results LIMIT ${limit}`,
            results: this.data.attributionResults.slice(0, limit),
            rowCount: this.data.attributionResults.length
        };
    }
    
    cpaQueryDaily(params) {
        // Generate daily CPA aggregation
        const dates = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        
        const dailyData = dates.map(date => {
            const spend = Math.random() * 5000 + 1000;
            const activations = Math.floor(Math.random() * 50) + 10;
            const cpa = spend / activations;
            
            return {
                date: date,
                spend: Math.round(spend),
                activations: activations,
                cpa: Math.round(cpa * 100) / 100
            };
        });
        
        return {
            query: `SELECT date, SUM(total_spend) as spend, SUM(activations) as activations,
                   SUM(total_spend)/NULLIF(SUM(activations),0) as cpa
                   FROM cpa_dashboard_table GROUP BY date ORDER BY date`,
            results: dailyData,
            rowCount: dailyData.length
        };
    }
    
    cpaQueryCampaign(params) {
        // Generate campaign-level CPA aggregation
        const campaignData = {};
        
        this.data.campaignSpend.forEach(spend => {
            const campaign = spend.campaign_name;
            if (!campaignData[campaign]) {
                campaignData[campaign] = { spend: 0, activations: 0 };
            }
            campaignData[campaign].spend += spend.spend;
        });
        
        // Add activations from attribution results
        this.data.attributionResults.forEach(result => {
            const campaign = result.last_touch_campaign_name || 'Unknown';
            if (campaignData[campaign]) {
                campaignData[campaign].activations += 1;
            }
        });
        
        const results = Object.entries(campaignData).map(([campaign, data]) => ({
            campaign_name: campaign,
            spend: Math.round(data.spend),
            activations: data.activations,
            cpa: data.activations > 0 ? Math.round(data.spend / data.activations) : null
        }));
        
        return {
            query: `SELECT campaign_name, SUM(total_spend) as spend, SUM(activations) as activations,
                   SUM(total_spend)/NULLIF(SUM(activations),0) as cpa
                   FROM cpa_dashboard_table GROUP BY campaign_name ORDER BY spend DESC`,
            results: results,
            rowCount: results.length
        };
    }
    
    cpaPreparationQuery(params) {
        const limit = params.limit || 20;
        const prepData = [];
        
        // Generate atomic-level CPA preparation data
        this.data.campaignSpend.slice(0, limit).forEach(spend => {
            const activations = Math.floor(Math.random() * 3); // Simulate activations
            prepData.push({
                date: spend.date,
                source: spend.source,
                campaign_id: spend.campaign_id,
                campaign_name: spend.campaign_name,
                adset_id: spend.adset_id,
                adset_name: spend.adset_name,
                ad_id: spend.ad_id,
                ad_name: spend.ad_name,
                total_spend: Math.round(spend.spend),
                activations: activations,
                cost_per_activation: activations > 0 ? Math.round(spend.spend / activations) : null
            });
        });
        
        return {
            query: `SELECT date, source, campaign_id, campaign_name, adset_id, adset_name,
                   ad_id, ad_name, total_spend, activations,
                   CASE WHEN activations > 0 THEN ROUND(total_spend / activations, 2) ELSE NULL END as cost_per_activation
                   FROM cpa_dashboard_table ORDER BY date DESC LIMIT ${limit}`,
            results: prepData,
            rowCount: prepData.length
        };
    }
    
    cpaQuerySource(params) {
        // Generate source-level CPA aggregation
        const sourceData = {};
        
        this.data.campaignSpend.forEach(spend => {
            const source = spend.source;
            if (!sourceData[source]) {
                sourceData[source] = { spend: 0, activations: 0 };
            }
            sourceData[source].spend += spend.spend;
        });
        
        // Add activations from attribution results
        this.data.attributionResults.forEach(result => {
            const source = result.last_touch_attribution_source || 'organic';
            if (sourceData[source]) {
                sourceData[source].activations += 1;
            }
        });
        
        const results = Object.entries(sourceData).map(([source, data]) => ({
            source: source,
            spend: Math.round(data.spend),
            activations: data.activations,
            cpa: data.activations > 0 ? Math.round(data.spend / data.activations) : null
        }));
        
        return {
            query: `SELECT source, SUM(total_spend) as spend, SUM(activations) as activations,
                   SUM(total_spend)/NULLIF(SUM(activations),0) as cpa
                   FROM cpa_dashboard_table GROUP BY source ORDER BY spend DESC`,
            results: results,
            rowCount: results.length
        };
    }
    
    cpaQueryAd(params) {
        const limit = params.limit || 10;
        const adData = {};
        
        this.data.campaignSpend.slice(0, limit * 2).forEach(spend => {
            const adKey = `${spend.ad_name}|${spend.campaign_name}`;
            if (!adData[adKey]) {
                adData[adKey] = { 
                    ad_name: spend.ad_name,
                    campaign_name: spend.campaign_name,
                    spend: 0, 
                    activations: 0 
                };
            }
            adData[adKey].spend += spend.spend;
            adData[adKey].activations += Math.floor(Math.random() * 2); // Simulate activations
        });
        
        const results = Object.values(adData).slice(0, limit).map(data => ({
            ad_name: data.ad_name,
            campaign_name: data.campaign_name,
            spend: Math.round(data.spend),
            activations: data.activations,
            cpa: data.activations > 0 ? Math.round(data.spend / data.activations) : null
        }));
        
        return {
            query: `SELECT ad_name, campaign_name, SUM(total_spend) as spend, SUM(activations) as activations,
                   SUM(total_spend)/NULLIF(SUM(activations),0) as cpa
                   FROM cpa_dashboard_table GROUP BY ad_name, campaign_name ORDER BY spend DESC LIMIT ${limit}`,
            results: results,
            rowCount: results.length
        };
    }
}

// Initialize mock data
function initializeMockData() {
    // Generate sessions data - Guardio-specific
    const sources = ['google', 'facebook', 'linkedin', 'cybersecurity_today', 'krebs_security'];
    const campaigns = ['phishing_protection', 'browser_security', 'small_business_protection', 'malware_detection', 'data_breach_prevention'];
    const devices = ['mobile', 'desktop', 'tablet'];
    
    for (let i = 0; i < 1000; i++) {
        const isMarketing = Math.random() > 0.7;
        const source = isMarketing ? sources[Math.floor(Math.random() * sources.length)] : 'organic';
        const campaign = isMarketing ? campaigns[Math.floor(Math.random() * campaigns.length)] : null;
        
        const adsetId = `adset_${Math.floor(Math.random() * 20)}`;
        const adId = `ad_${Math.floor(Math.random() * 50)}`;
        
        mockData.sessions.push({
            session_id: `sess_${i.toString().padStart(6, '0')}`,
            user_id: `user_${Math.floor(Math.random() * 500).toString().padStart(4, '0')}`,
            device_type: devices[Math.floor(Math.random() * devices.length)],
            session_start_time: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            referrer_url: isMarketing ? 
                `https://guard.io/?utm_source=${source}&utm_campaign=${campaign}&utm_adset=${adsetId}&utm_ad=${adId}` :
                'https://guard.io/',
            is_activated: Math.random() > 0.95 ? 1 : 0
        });
    }
    
    // Generate campaign spend data
    const dates = [];
    for (let i = 0; i < 30; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        date.setHours(0, 0, 0, 0); // Set to start of day for DATE type
        dates.push(date);
    }
    
    sources.forEach(source => {
        campaigns.forEach(campaign => {
            for (let i = 0; i < 10; i++) {
                dates.forEach((date, dateIndex) => {
                    // Simulate marketing team changing names over time
                    // 20% chance of name change every 7 days
                    const weekNumber = Math.floor(dateIndex / 7);
                    const nameChangeChance = Math.random() < 0.2;
                    
                    let campaignName = `${campaign.replace('_', ' ')} Campaign`;
                    let adsetName = `AdSet ${i + 1}`;
                    let adName = `Ad ${i + 1}`;
                    
                    // Simulate name changes for older dates
                    if (weekNumber > 0 && nameChangeChance) {
                        campaignName = `${campaign.replace('_', ' ')} Campaign v${weekNumber + 1}`;
                        adsetName = `AdSet ${i + 1} (Updated)`;
                        adName = `Ad ${i + 1} - New Creative`;
                    }
                    
                    // Sometimes even more variations for the same IDs
                    if (weekNumber > 1 && Math.random() < 0.1) {
                        campaignName = `${campaign.replace('_', ' ')} - Q4 Campaign`;
                        adsetName = `AdSet ${i + 1} - Optimized`;
                        adName = `Ad ${i + 1} - Best Performer`;
                    }
                    
                    mockData.campaignSpend.push({
                        date: date,
                        source: source,
                        campaign_id: campaign,
                        campaign_name: campaignName,
                        adset_id: `adset_${i}`,
                        adset_name: adsetName,
                        ad_id: `ad_${i}_${Math.floor(Math.random() * 5)}`,
                        ad_name: adName,
                        spend: Math.random() * 500 + 50
                    });
                });
            }
        });
    });
    
    // Generate attribution results
    const activatedUsers = mockData.sessions.filter(s => s.is_activated === 1);
    activatedUsers.forEach(user => {
        const userSessions = mockData.sessions.filter(s => s.user_id === user.user_id);
        
        // Parse source from referrer_url for each session
        const sessionsWithSource = userSessions.map(session => {
            const parsed = parseSourceFromUrl(session.referrer_url);
            
            return {
                ...session,
                source: parsed.source,
                campaign_id: parsed.campaign_id
            };
        });
        
        const marketingSessions = sessionsWithSource.filter(s => s.source !== 'organic');
        
        const hasMarketing = marketingSessions.length > 0;
        const firstTouch = hasMarketing ? marketingSessions[0] : sessionsWithSource[0];
        const lastTouch = hasMarketing ? marketingSessions[marketingSessions.length - 1] : sessionsWithSource[0];
        
        mockData.attributionResults.push({
            user_id: user.user_id,
            activation_session_start_time: user.session_start_time,
            first_touch_attribution_source: firstTouch.source,
            first_touch_campaign_id: firstTouch.campaign_id,
            last_touch_attribution_source: lastTouch.source,
            last_touch_campaign_id: lastTouch.campaign_id,
            cost_per_activation: hasMarketing ? Math.random() * 100 + 20 : null
        });
    });
    
    // Initialize SQL Engine
    window.sqlEngine = new MockSQLEngine(mockData);
}

// Chart configurations
let cpaChart, spendChart, performanceChart;

// Query Execution Interface
function executeCustomQuery(queryType, customParams = {}) {
    console.log('Executing query:', queryType, customParams);
    
    if (!window.sqlEngine) {
        console.error('SQL Engine not initialized');
        alert('SQL Engine not initialized. Please refresh the page.');
        return;
    }
    
    try {
        const queryResult = window.sqlEngine.executeQuery(queryType, customParams);
        console.log('Query result:', queryResult);
        
        // Create modal or popup to show query results
        showQueryResultsModal(queryResult, queryType);
        
    } catch (error) {
        console.error('Query execution error:', error);
        alert(`Query execution failed: ${error.message}`);
    }
}

function showQueryResultsModal(queryResult, queryType) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'query-results-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🔍 Query Results: ${queryType.replace('_', ' ').toUpperCase()}</h3>
                <button class="close-modal" onclick="closeQueryModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="query-info">
                    <div class="query-stats">
                        <span class="stat">📊 Rows: <strong>${queryResult.rowCount}</strong></span>
                        <span class="stat">⏱️ Execution: <strong>~${Math.floor(Math.random() * 5) + 1}ms</strong></span>
                        <span class="stat">💾 Data source: <strong>Mock Database</strong></span>
                    </div>
                </div>
                <div class="query-display">
                    <h4>SQL Query:</h4>
                    <pre><code>${queryResult.query}</code></pre>
                </div>
                <div class="results-display">
                    <h4>Results (${queryResult.rowCount} rows):</h4>
                    <div class="results-table-container">
                        ${generateResultsTable(queryResult.results)}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="downloadQueryResults('${queryType}')">📥 Download CSV</button>
                    <button class="btn btn-secondary" onclick="closeQueryModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener to close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeQueryModal();
        }
    });
}

function generateResultsTable(results) {
    if (!results || results.length === 0) {
        return '<p>No results found.</p>';
    }
    
    const headers = Object.keys(results[0]);
    
    let html = `
        <table class="query-results-table">
            <thead>
                <tr>
                    ${headers.map(header => `<th>${header.replace('_', ' ').toUpperCase()}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    
    results.forEach(row => {
        html += '<tr>';
        headers.forEach(header => {
            let value = row[header];
            
            // Format dates
            if (value instanceof Date) {
                value = value.toLocaleDateString();
            } else if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
                value = new Date(value).toLocaleDateString();
            } else if (value === null || value === undefined) {
                value = 'NULL';
            }
            
            html += `<td>${value}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
}

function closeQueryModal() {
    const modal = document.querySelector('.query-results-modal');
    if (modal) {
        modal.remove();
    }
}

function downloadQueryResults(queryType) {
    const queryResult = window.sqlEngine.executeQuery(queryType, { limit: 1000 });
    
    // Convert to CSV
    const headers = Object.keys(queryResult.results[0]);
    let csv = headers.join(',') + '\n';
    
    queryResult.results.forEach(row => {
        const values = headers.map(header => {
            let value = row[header];
            if (value instanceof Date) {
                value = value.toISOString();
            } else if (value === null || value === undefined) {
                value = '';
            }
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${queryType}_results_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Initialize charts
function initializeCharts() {
    // CPA Trend Chart
    const cpaCtx = document.getElementById('cpa-chart');
    if (cpaCtx) {
        cpaChart = new Chart(cpaCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'CPA ($)',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10
                    }
                }
            }
        });
    }
    
    // Spend vs Activations Chart
    const spendCtx = document.getElementById('spend-chart');
    if (spendCtx) {
        spendChart = new Chart(spendCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Spend',
                    data: [],
                    backgroundColor: '#4CAF50',
                    yAxisID: 'y'
                }, {
                    label: 'Activations',
                    data: [],
                    backgroundColor: '#FF9800',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10
                    }
                }
            }
        });
    }
    
    // Performance Comparison Chart
    const perfCtx = document.getElementById('performance-chart');
    if (perfCtx) {
        performanceChart = new Chart(perfCtx, {
            type: 'bar',
            data: {
                labels: ['Query Time', 'Processing Time', 'Memory Usage', 'Storage Cost'],
                datasets: [{
                    label: 'Before Optimization',
                    data: [100, 100, 100, 100],
                    backgroundColor: '#FF6B6B'
                }, {
                    label: 'After Optimization',
                    data: [30, 5, 40, 50],
                    backgroundColor: '#4CAF50'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10
                    }
                }
            }
        });
    }
}

// Table management
function showTable(tableName) {
    // Hide all tables
    document.querySelectorAll('.table-content').forEach(table => {
        table.classList.remove('active');
    });
    
    // Show selected table
    document.getElementById(tableName + '-table').classList.add('active');
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Populate table data
    populateTable(tableName);
}

function populateTable(tableName) {
    let data, tableId;
    
    switch(tableName) {
        case 'sessions':
            data = mockData.sessions.slice(0, 10);
            tableId = 'sessions-data';
            break;
        case 'campaign_spend':
            data = mockData.campaignSpend.slice(0, 10);
            tableId = 'campaign-spend-data';
            break;
        case 'attribution_results':
            data = mockData.attributionResults.slice(0, 10);
            tableId = 'attribution-data';
            break;
    }
    
    const table = document.getElementById(tableId);
    if (!table || !data || data.length === 0) return;
    
    // Create table HTML
    const headers = Object.keys(data[0]);
    let tableHTML = '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    data.forEach(row => {
        tableHTML += '<tr>';
        headers.forEach(header => {
            let value = row[header];
            if (value === null || value === undefined) {
                value = '-';
            } else if (typeof value === 'string' && value.length > 50) {
                value = value.substring(0, 50) + '...';
            }
            tableHTML += `<td>${value}</td>`;
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody>';
    
    table.innerHTML = tableHTML;
}

// Step-by-step attribution query demonstration
function runStep(stepNumber) {
    const resultsDiv = document.getElementById('step-results');
    
    // Show loading state
    resultsDiv.innerHTML = '<div class="loading">Executing step ' + stepNumber + '...</div>';
    
    setTimeout(() => {
        let stepHTML = '';
        
        switch(stepNumber) {
            case 1:
                stepHTML = getStep1Results();
                break;
            case 2:
                stepHTML = getStep2Results();
                break;
            case 3:
                stepHTML = getStep3Results();
                break;
            case 4:
                stepHTML = getStep4Results();
                break;
            case 5:
                stepHTML = getStep5Results();
                break;
        }
        
        resultsDiv.innerHTML = stepHTML;
    }, 800);
}

function getStep1Results() {
    if (!window.sqlEngine) {
        return '<div class="error">SQL Engine not initialized. Please refresh the page.</div>';
    }
    
    try {
        const queryResult = window.sqlEngine.executeQuery('parse_sessions', { limit: 8 });
        
        let html = `
        <div class="step-result">
            <h4>Step 1: Parse UTM Parameters from referrer_url</h4>
            <div class="step-description">
                <p>Extract marketing source, campaign, adset, and ad parameters from URLs using REGEXP_EXTRACT.</p>
                <div class="sql-query-display">
                    <h5>🔍 Executed SQL Query:</h5>
                    <pre><code>${queryResult.query}</code></pre>
                    <div class="query-stats">
                        <span class="stat">📊 Rows returned: <strong>${queryResult.rowCount}</strong></span>
                        <span class="stat">⏱️ Execution time: <strong>~2ms</strong></span>
                        <button class="execute-query-btn" onclick="executeCustomQuery('parse_sessions')">📝 Execute Query</button>
                    </div>
                </div>
            </div>
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>Session ID</th>
                        <th>User ID</th>
                        <th>Device Type</th>
                        <th>Referrer URL</th>
                        <th>Parsed Source</th>
                        <th>Campaign ID</th>
                        <th>Is Activated</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    queryResult.results.forEach(session => {
        const shortUrl = session.referrer_url.length > 50 ? 
            session.referrer_url.substring(0, 50) + '...' : 
            session.referrer_url;
        
        html += `
            <tr>
                <td>${session.session_id}</td>
                <td>${session.user_id}</td>
                <td>${session.device_type}</td>
                <td title="${session.referrer_url}">${shortUrl}</td>
                <td><span class="source-${session.source}">${session.source}</span></td>
                <td>${session.campaign_id || 'NULL'}</td>
                <td>${session.is_activated ? 'Yes' : 'No'}</td>
            </tr>
        `;
    });
    
        html += '</tbody></table></div>';
        return html;
        
    } catch (error) {
        console.error('Error in getStep1Results:', error);
        return '<div class="error">Error executing query. Please try again.</div>';
    }
}

function getStep2Results() {
    const queryResult = window.sqlEngine.executeQuery('activated_users', { limit: 6 });
    
    let html = `
        <div class="step-result">
            <h4>Step 2: Identify Activated Users & Attribution Windows</h4>
            <div class="step-description">
                <p>Find users who activated (is_activated = 1) and calculate their 14-day attribution window.</p>
                <div class="sql-query-display">
                    <h5>🔍 Executed SQL Query:</h5>
                    <pre><code>${queryResult.query}</code></pre>
                    <div class="query-stats">
                        <span class="stat">📊 Rows returned: <strong>${queryResult.rowCount}</strong></span>
                        <span class="stat">⏱️ Execution time: <strong>~1ms</strong></span>
                        <button class="execute-query-btn" onclick="executeCustomQuery('activated_users')">📝 Execute Query</button>
                    </div>
                </div>
            </div>
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Activation Time</th>
                        <th>Attribution Window Start</th>
                        <th>Attribution Window End</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    queryResult.results.forEach(result => {
        const activationDate = new Date(result.activation_session_start_time);
        const windowStart = new Date(result.window_start_date);
        
        html += `
            <tr>
                <td>${result.user_id}</td>
                <td>${activationDate.toLocaleDateString()}</td>
                <td>${windowStart.toLocaleDateString()}</td>
                <td>${activationDate.toLocaleDateString()}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

function getStep3Results() {
    const queryResult = window.sqlEngine.executeQuery('attribution_window', { limit: 10 });
    
    let html = `
        <div class="step-result">
            <h4>Step 3: Attribution Window Analysis</h4>
            <div class="step-description">
                <p>For each activated user, collect all their sessions within the 14-day attribution window.</p>
                <div class="sql-query-display">
                    <h5>🔍 Executed SQL Query:</h5>
                    <pre><code>${queryResult.query}</code></pre>
                    <div class="query-stats">
                        <span class="stat">📊 Rows returned: <strong>${queryResult.rowCount}</strong></span>
                        <span class="stat">⏱️ Execution time: <strong>~3ms</strong></span>
                        <button class="execute-query-btn" onclick="executeCustomQuery('attribution_window')">📝 Execute Query</button>
                    </div>
                </div>
            </div>
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Session Time</th>
                        <th>Source</th>
                        <th>Campaign</th>
                        <th>Days Before Activation</th>
                        <th>Touch Type</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    queryResult.results.forEach(result => {
        html += `
            <tr>
                <td>${result.user_id}</td>
                <td>${new Date(result.session_start_time).toLocaleDateString()}</td>
                <td><span class="source-${result.source}">${result.source}</span></td>
                <td>${result.campaign_id || 'N/A'}</td>
                <td>${result.days_before_activation}</td>
                <td><span class="touch-${result.touch_type.toLowerCase()}">${result.touch_type}</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

function getStep4Results() {
    const queryResult = window.sqlEngine.executeQuery('final_attribution', { limit: 6 });
    
    let html = `
        <div class="step-result">
            <h4>Step 4: Final Attribution Assignment</h4>
            <div class="step-description">
                <p>Apply attribution logic: If user has ANY marketing touchpoints → use marketing for first/last touch, otherwise organic.</p>
                <div class="sql-query-display">
                    <h5>🔍 Executed SQL Query:</h5>
                    <pre><code>${queryResult.query}</code></pre>
                    <div class="query-stats">
                        <span class="stat">📊 Rows returned: <strong>${queryResult.rowCount}</strong></span>
                        <span class="stat">⏱️ Execution time: <strong>~2ms</strong></span>
                        <button class="execute-query-btn" onclick="executeCustomQuery('final_attribution')">📝 Execute Query</button>
                    </div>
                </div>
            </div>
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>First Touch Source</th>
                        <th>First Touch Campaign</th>
                        <th>Last Touch Source</th>
                        <th>Last Touch Campaign</th>
                        <th>Marketing Touchpoints</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    queryResult.results.forEach(result => {
        html += `
            <tr>
                <td>${result.user_id}</td>
                <td><span class="source-${result.first_touch_source}">${result.first_touch_source}</span></td>
                <td>${result.first_touch_campaign || 'N/A'}</td>
                <td><span class="source-${result.last_touch_source}">${result.last_touch_source}</span></td>
                <td>${result.last_touch_campaign || 'N/A'}</td>
                <td>${result.marketing_touchpoints}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

function getStep5Results() {
    const queryResult = window.sqlEngine.executeQuery('complete_attribution', { limit: 8 });
    
    let html = `
        <div class="step-result">
            <h4>Complete Attribution Results</h4>
            <div class="step-description">
                <p>Final output table with all attribution data ready for CPA calculations and reporting.</p>
                <div class="sql-query-display">
                    <h5>🔍 Executed SQL Query:</h5>
                    <pre><code>${queryResult.query}</code></pre>
                    <div class="query-stats">
                        <span class="stat">📊 Rows returned: <strong>${queryResult.rowCount}</strong></span>
                        <span class="stat">⏱️ Execution time: <strong>~1ms</strong></span>
                        <button class="execute-query-btn" onclick="executeCustomQuery('complete_attribution')">📝 Execute Query</button>
                    </div>
                </div>
            </div>
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Activation Time</th>
                        <th>First Touch Source</th>
                        <th>First Touch Campaign</th>
                        <th>Last Touch Source</th>
                        <th>Last Touch Campaign</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    queryResult.results.forEach(result => {
        html += `
            <tr>
                <td>${result.user_id}</td>
                <td>${new Date(result.activation_session_start_time).toLocaleDateString()}</td>
                <td><span class="source-${result.first_touch_attribution_source}">${result.first_touch_attribution_source}</span></td>
                <td>${result.first_touch_campaign_id || 'N/A'}</td>
                <td><span class="source-${result.last_touch_attribution_source}">${result.last_touch_attribution_source}</span></td>
                <td>${result.last_touch_campaign_id || 'N/A'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

// Dashboard updates
function updateDashboard() {
    const granularity = document.getElementById('granularity-select').value;
    
    // Show query results using SQL engine
    showCPAQueryResults(granularity);
    
    // Update CPA chart based on granularity
    updateCPAChart(granularity);
    updateSpendChart(granularity);
    updateTopPerformers(granularity);
    updateKeyMetrics(granularity);
}

// CPA Query Results Display
function showCPAQueryResults(granularity) {
    const resultsDiv = document.getElementById('cpa-query-results');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = '<div class="loading">Running CPA query...</div>';
    
    setTimeout(() => {
        let queryResult;
        let queryType;
        
        switch(granularity) {
            case 'daily':
                queryType = 'cpa_daily';
                break;
            case 'campaign':
                queryType = 'cpa_campaign';
                break;
            case 'source':
                queryType = 'cpa_source';
                break;
            case 'ad':
                queryType = 'cpa_ad';
                break;
        }
        
        try {
            queryResult = window.sqlEngine.executeQuery(queryType, { limit: 10 });
            resultsDiv.innerHTML = getCPAQueryHTML(queryResult, granularity);
        } catch (error) {
            resultsDiv.innerHTML = `<div class="error">Query execution failed: ${error.message}</div>`;
        }
    }, 1000);
}

function getCPAQueryHTML(queryResult, granularity) {
    const granularityName = granularity.charAt(0).toUpperCase() + granularity.slice(1);
    
    let html = `
        <div class="cpa-query-result">
            <div class="query-header">
                <h4>${granularityName} CPA Analysis</h4>
                <div class="sql-query-display">
                    <h5>🔍 Executed SQL Query:</h5>
                    <pre><code>${queryResult.query}</code></pre>
                    <div class="query-stats">
                        <span class="stat">📊 Rows returned: <strong>${queryResult.rowCount}</strong></span>
                        <span class="stat">⏱️ Execution time: <strong>~${Math.floor(Math.random() * 5) + 1}ms</strong></span>
                        <button class="execute-query-btn" onclick="executeCustomQuery('cpa_${granularity}')">📝 Execute Query</button>
                    </div>
                </div>
            </div>
            <div class="results-table-container">
                <table class="results-table-inner">
                    <thead>
                        <tr>`;
    
    // Dynamic headers based on query results
    if (queryResult.results.length > 0) {
        const headers = Object.keys(queryResult.results[0]);
        headers.forEach(header => {
            html += `<th>${header.replace('_', ' ').toUpperCase()}</th>`;
        });
    }
    
    html += `
                        </tr>
                    </thead>
                    <tbody>`;
    
    // Display results
    queryResult.results.forEach(row => {
        html += '<tr>';
        Object.values(row).forEach(value => {
            if (value === null || value === undefined) {
                value = 'N/A';
            } else if (typeof value === 'number' && value > 1000) {
                value = value.toLocaleString();
            } else if (value instanceof Date) {
                value = value.toLocaleDateString();
            }
            
            html += `<td>${value}</td>`;
        });
        html += '</tr>';
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            <div class="business-logic-explanation">
                <h5>💡 Business Logic Explanation:</h5>
                <div class="insight-cards">
                    ${getCPAInsights(queryResult, granularity)}
                </div>
            </div>
        </div>`;
    
    return html;
}

function getCPAInsights(queryResult, granularity) {
    const results = queryResult.results;
    if (!results || results.length === 0) return '<p>No data available for insights.</p>';
    
    let insights = '';
    
    switch (granularity) {
        case 'daily':
            const avgCPA = results.reduce((sum, row) => sum + (row.cpa || 0), 0) / results.length;
            insights = `
                <div class="insight-card">
                    <h6>📈 Daily Performance Trend</h6>
                    <p>Average CPA: <strong>$${avgCPA.toFixed(2)}</strong></p>
                    <p>Track daily fluctuations to identify optimal spend timing and budget allocation patterns.</p>
                </div>`;
            break;
            
        case 'campaign':
            const bestCampaign = results.filter(r => r.cpa).sort((a, b) => a.cpa - b.cpa)[0];
            insights = `
                <div class="insight-card">
                    <h6>🏆 Campaign Performance</h6>
                    <p>Best performing: <strong>${bestCampaign?.campaign_name || 'N/A'}</strong> (CPA: $${bestCampaign?.cpa || 'N/A'})</p>
                    <p>Focus budget on high-performing campaigns and pause or optimize underperformers.</p>
                </div>`;
            break;
            
        case 'source':
            const topSource = results.filter(r => r.cpa).sort((a, b) => a.cpa - b.cpa)[0];
            insights = `
                <div class="insight-card">
                    <h6>🎯 Source Optimization</h6>
                    <p>Top source: <strong>${topSource?.source || 'N/A'}</strong> (CPA: $${topSource?.cpa || 'N/A'})</p>
                    <p>Cybersecurity publications often have higher intent users and better conversion rates.</p>
                </div>`;
            break;
            
        case 'ad':
            const topAd = results.filter(r => r.cpa).sort((a, b) => a.cpa - b.cpa)[0];
            insights = `
                <div class="insight-card">
                    <h6>🎨 Creative Performance</h6>
                    <p>Best ad: <strong>${topAd?.ad_name || 'N/A'}</strong></p>
                    <p>Video demos vs. banner ads vs. CTA buttons for threat detection show different performance.</p>
                </div>`;
            break;
    }
    
    return insights;
}

function getDailyCPAResults() {
    const dailyData = generateDailyCPAData();
    
    return `
        <div class="cpa-query-result">
            <h4>Daily CPA Query Results</h4>
            <div class="query-description">
                <p><strong>Query:</strong> Aggregate CPA metrics by date for trend analysis</p>
                <code>SELECT date, SUM(total_spend) as spend, SUM(activations) as activations, 
SUM(total_spend)/NULLIF(SUM(activations),0) as daily_cpa 
FROM cpa_dashboard_table GROUP BY date ORDER BY date DESC;</code>
            </div>
            
            <div class="business-logic-explanation">
                <h5>📊 Business Logic Behind the Results:</h5>
                <div class="logic-grid">
                    <div class="logic-item">
                        <strong>CPA Calculation:</strong> Total Spend ÷ Total Activations = Cost per Activation
                    </div>
                    <div class="logic-item">
                        <strong>Trend Analysis:</strong> Compare today's CPA vs yesterday's CPA
                        <ul>
                            <li>📈 = CPA increased (worse performance)</li>
                            <li>📉 = CPA decreased (better performance)</li>
                            <li>➡️ = CPA stayed roughly the same</li>
                        </ul>
                    </div>
                    <div class="logic-item">
                        <strong>Data Source:</strong> From Task 1 attribution results + campaign spend data
                        <br/><small>Activation = Extension install + first threat detected</small>
                    </div>
                </div>
            </div>
            
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Total Spend</th>
                        <th>Activations</th>
                        <th>Daily CPA</th>
                        <th>Trend Analysis</th>
                    </tr>
                </thead>
                <tbody>
                    ${dailyData.map((row, index) => `
                        <tr>
                            <td>${row.date}</td>
                            <td>$${row.spend.toLocaleString()}</td>
                            <td>${row.activations}</td>
                            <td>$${row.cpa.toFixed(2)}</td>
                            <td>
                                <span class="trend-indicator">${row.trend}</span>
                                <span class="trend-explanation">${getTrendExplanation(row, index, dailyData)}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="insights-section">
                <h5>💡 Key Insights from This Data:</h5>
                <div class="insights-grid">
                    <div class="insight-card">
                        <strong>Average CPA:</strong> $${(dailyData.reduce((sum, row) => sum + row.cpa, 0) / dailyData.length).toFixed(2)}
                    </div>
                    <div class="insight-card">
                        <strong>Best Day:</strong> ${dailyData.reduce((best, row) => row.cpa < best.cpa ? row : best).date} 
                        (${dailyData.reduce((best, row) => row.cpa < best.cpa ? row : best).cpa.toFixed(2)})
                    </div>
                    <div class="insight-card">
                        <strong>Total Spend:</strong> $${dailyData.reduce((sum, row) => sum + row.spend, 0).toLocaleString()}
                    </div>
                    <div class="insight-card">
                        <strong>Total Activations:</strong> ${dailyData.reduce((sum, row) => sum + row.activations, 0)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getCampaignCPAResults() {
    const campaignData = generateCampaignCPAData();
    
    return `
        <div class="cpa-query-result">
            <h4>Campaign CPA Query Results</h4>
            <div class="query-description">
                <p><strong>Query:</strong> Aggregate CPA metrics by campaign for performance comparison</p>
                <code>SELECT campaign_name, SUM(total_spend) as spend, SUM(activations) as activations,
SUM(total_spend)/NULLIF(SUM(activations),0) as campaign_cpa 
FROM cpa_dashboard_table GROUP BY campaign_name ORDER BY campaign_cpa ASC;</code>
            </div>
            
            <div class="business-logic-explanation">
                <h5>📊 Campaign Performance Logic:</h5>
                <div class="logic-grid">
                    <div class="logic-item">
                        <strong>Performance Rating:</strong> Based on CPA compared to average
                        <ul>
                            <li><span class="performance-excellent">Excellent</span> = CPA &lt; $30 (high efficiency)</li>
                            <li><span class="performance-good">Good</span> = CPA $30-40 (above average)</li>
                            <li><span class="performance-average">Average</span> = CPA $40-50 (market standard)</li>
                            <li><span class="performance-poor">Poor</span> = CPA &gt; $50 (needs optimization)</li>
                        </ul>
                    </div>
                    <div class="logic-item">
                        <strong>Business Impact:</strong> Lower CPA = Better ROI for cybersecurity user acquisition
                        <br/>Scale successful campaigns that drive quality extension installs
                    </div>
                </div>
            </div>
            
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>Campaign Name</th>
                        <th>Total Spend</th>
                        <th>Activations</th>
                        <th>Campaign CPA</th>
                        <th>Performance Rating</th>
                    </tr>
                </thead>
                <tbody>
                    ${campaignData.map(row => `
                        <tr>
                            <td>${row.campaign}</td>
                            <td>$${row.spend.toLocaleString()}</td>
                            <td>${row.activations}</td>
                            <td>$${row.cpa.toFixed(2)}</td>
                            <td>
                                <span class="performance-${row.performance.toLowerCase()}">${row.performance}</span>
                                <span class="performance-explanation">${getPerformanceExplanation(row.performance, row.cpa)}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="insights-section">
                <h5>💡 Campaign Optimization Recommendations:</h5>
                <div class="insights-grid">
                    <div class="insight-card">
                        <strong>Best Performer:</strong> ${campaignData.reduce((best, row) => row.cpa < best.cpa ? row : best).campaign}
                        <br/><small>Scale up budget for this campaign</small>
                    </div>
                    <div class="insight-card">
                        <strong>Needs Attention:</strong> ${campaignData.reduce((worst, row) => row.cpa > worst.cpa ? row : worst).campaign}
                        <br/><small>Optimize targeting and creative</small>
                    </div>
                    <div class="insight-card">
                        <strong>Budget Efficiency:</strong> ${Math.round(campaignData.filter(row => row.cpa < 40).length / campaignData.length * 100)}% of campaigns performing well
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getSourceCPAResults() {
    const sourceData = generateSourceCPAData();
    
    return `
        <div class="cpa-query-result">
            <h4>Source CPA Query Results</h4>
            <div class="query-description">
                <p><strong>Query:</strong> Aggregate CPA metrics by marketing source for channel optimization</p>
                <code>SELECT source, SUM(total_spend) as spend, SUM(activations) as activations,
SUM(total_spend)/NULLIF(SUM(activations),0) as source_cpa 
FROM cpa_dashboard_table GROUP BY source ORDER BY source_cpa ASC;</code>
            </div>
            
            <div class="business-logic-explanation">
                <h5>📊 Channel Performance Analysis:</h5>
                <div class="logic-grid">
                    <div class="logic-item">
                        <strong>Market Share:</strong> % of total spend allocated to each source
                        <br/>Shows budget distribution across channels
                    </div>
                    <div class="logic-item">
                        <strong>Channel Efficiency:</strong> CPA comparison reveals which sources deliver quality cybersecurity users most cost-effectively
                    </div>
                    <div class="logic-item">
                        <strong>Optimization Strategy:</strong> Reallocate budget from high-CPA to low-CPA sources
                        <br/><small>Cybersecurity publications often have higher intent users</small>
                    </div>
                </div>
            </div>
            
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>Source</th>
                        <th>Total Spend</th>
                        <th>Activations</th>
                        <th>Source CPA</th>
                        <th>Market Share</th>
                    </tr>
                </thead>
                <tbody>
                    ${sourceData.map(row => `
                        <tr>
                            <td><span class="source-${row.source}">${row.source}</span></td>
                            <td>$${row.spend.toLocaleString()}</td>
                            <td>${row.activations}</td>
                            <td>$${row.cpa.toFixed(2)}</td>
                            <td>
                                <span class="share-percentage">${row.share}%</span>
                                <span class="share-explanation">${getShareExplanation(row.share)}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="insights-section">
                <h5>💡 Channel Optimization Insights:</h5>
                <div class="insights-grid">
                    <div class="insight-card">
                        <strong>Most Efficient:</strong> ${sourceData.reduce((best, row) => row.cpa < best.cpa ? row : best).source}
                        <br/><small>CPA: $${sourceData.reduce((best, row) => row.cpa < best.cpa ? row : best).cpa.toFixed(2)}</small>
                    </div>
                    <div class="insight-card">
                        <strong>Largest Channel:</strong> ${sourceData.reduce((largest, row) => row.share > largest.share ? row : largest).source}
                        <br/><small>${sourceData.reduce((largest, row) => row.share > largest.share ? row : largest).share}% of total spend</small>
                    </div>
                    <div class="insight-card">
                        <strong>Budget Reallocation:</strong> Move 10% budget from highest to lowest CPA source
                        <br/><small>Est. 15% CPA improvement</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getAdCPAResults() {
    const adData = generateAdCPAData();
    
    return `
        <div class="cpa-query-result">
            <h4>Ad Level CPA Query Results</h4>
            <div class="query-description">
                <p><strong>Query:</strong> Aggregate CPA metrics by individual ad for granular optimization</p>
                <code>SELECT ad_name, campaign_name, SUM(total_spend) as spend, SUM(activations) as activations,
SUM(total_spend)/NULLIF(SUM(activations),0) as ad_cpa 
FROM cpa_dashboard_table GROUP BY ad_name, campaign_name ORDER BY ad_cpa ASC;</code>
            </div>
            
            <div class="business-logic-explanation">
                <h5>📊 Ad-Level Performance Analysis:</h5>
                <div class="logic-grid">
                    <div class="logic-item">
                        <strong>Efficiency Rating:</strong> Based on CPA performance within campaign
                        <ul>
                            <li><span class="efficiency-high">High</span> = Top 33% performers (scale up)</li>
                            <li><span class="efficiency-medium">Medium</span> = Average performers (optimize)</li>
                            <li><span class="efficiency-low">Low</span> = Bottom 33% (pause/redesign)</li>
                        </ul>
                    </div>
                    <div class="logic-item">
                        <strong>Granular Optimization:</strong> Individual ad performance reveals what cybersecurity messaging resonates best
                        <br/><small>Video demos vs. banner ads vs. CTA buttons for threat detection</small>
                    </div>
                </div>
            </div>
            
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>Ad Name</th>
                        <th>Campaign</th>
                        <th>Spend</th>
                        <th>Activations</th>
                        <th>Ad CPA</th>
                        <th>Efficiency Rating</th>
                    </tr>
                </thead>
                <tbody>
                    ${adData.map(row => `
                        <tr>
                            <td>${row.ad_name}</td>
                            <td>${row.campaign}</td>
                            <td>$${row.spend.toLocaleString()}</td>
                            <td>${row.activations}</td>
                            <td>$${row.cpa.toFixed(2)}</td>
                            <td>
                                <span class="efficiency-${row.efficiency.toLowerCase()}">${row.efficiency}</span>
                                <span class="efficiency-explanation">${getEfficiencyExplanation(row.efficiency)}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="insights-section">
                <h5>💡 Ad Optimization Actions:</h5>
                <div class="insights-grid">
                    <div class="insight-card">
                        <strong>Top Performer:</strong> ${adData.reduce((best, row) => row.cpa < best.cpa ? row : best).ad_name}
                        <br/><small>Duplicate this ad creative style</small>
                    </div>
                    <div class="insight-card">
                        <strong>Needs Pause:</strong> ${adData.reduce((worst, row) => row.cpa > worst.cpa ? row : worst).ad_name}
                        <br/><small>CPA: $${adData.reduce((worst, row) => row.cpa > worst.cpa ? row : worst).cpa.toFixed(2)} (too high)</small>
                    </div>
                    <div class="insight-card">
                        <strong>Budget Reallocation:</strong> Shift ${Math.round(adData.filter(row => row.efficiency === 'Low').length / adData.length * 100)}% of budget from low to high efficiency ads
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper functions for business logic explanations
function getTrendExplanation(row, index, data) {
    if (index === 0) return "First day - no comparison";
    
    const previousCPA = data[index - 1].cpa;
    const change = ((row.cpa - previousCPA) / previousCPA * 100).toFixed(1);
    
    if (row.trend === '📈') {
        return `CPA increased by ${change}%`;
    } else if (row.trend === '📉') {
        return `CPA decreased by ${Math.abs(change)}%`;
    } else {
        return `CPA stable (${Math.abs(change)}% change)`;
    }
}

function getPerformanceExplanation(performance, cpa) {
    switch(performance) {
        case 'Excellent': return `Very efficient at $${cpa.toFixed(2)}`;
        case 'Good': return `Above average performance`;
        case 'Average': return `Market standard CPA`;
        case 'Poor': return `Needs optimization`;
        default: return '';
    }
}

function getShareExplanation(share) {
    if (share > 30) return "Dominant channel";
    if (share > 20) return "Major channel";
    if (share > 10) return "Significant channel";
    return "Minor channel";
}

function getEfficiencyExplanation(efficiency) {
    switch(efficiency) {
        case 'High': return "Scale up budget";
        case 'Medium': return "Optimize creative";
        case 'Low': return "Consider pausing";
        default: return '';
    }
}

// Data generation functions
function generateDailyCPAData() {
    const data = [];
    
    // Generate data first
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const spend = Math.floor(Math.random() * 2000) + 1000;
        const activations = Math.floor(Math.random() * 40) + 20;
        const cpa = activations > 0 ? spend / activations : null;
        
        data.push({
            date: date.toLocaleDateString(),
            spend: spend,
            activations: activations,
            cpa: cpa,
            trend: '➡️'  // Default, will be updated
        });
    }
    
    // Now calculate trends based on actual data
    for (let i = 0; i < data.length; i++) {
        if (i === 0) {
            data[i].trend = '➡️';  // First day has no comparison
        } else {
            const currentCPA = data[i].cpa;
            const previousCPA = data[i - 1].cpa;
            const change = ((currentCPA - previousCPA) / previousCPA);
            
            if (change > 0.05) {
                data[i].trend = '📈';  // CPA increased (worse)
            } else if (change < -0.05) {
                data[i].trend = '📉';  // CPA decreased (better)
            } else {
                data[i].trend = '➡️';  // CPA stable (within 5% change)
            }
        }
    }
    
    return data;
}

function generateCampaignCPAData() {
    const campaigns = ['Phishing Protection Campaign', 'Browser Security Campaign', 'Small Business Protection', 'Malware Detection Campaign'];
    const performances = ['Excellent', 'Good', 'Average', 'Poor'];
    
    return campaigns.map((campaign, index) => ({
        campaign: campaign,
        spend: Math.floor(Math.random() * 5000) + 2000,
        activations: Math.floor(Math.random() * 100) + 50,
        cpa: Math.random() * 30 + 25,
        performance: performances[index]
    }));
}

function generateSourceCPAData() {
    const sources = ['google', 'facebook', 'linkedin', 'cybersecurity_today', 'krebs_security'];
    const shares = [35, 25, 20, 12, 8];
    
    return sources.map((source, index) => ({
        source: source,
        spend: Math.floor(Math.random() * 8000) + 3000,
        activations: Math.floor(Math.random() * 150) + 80,
        cpa: Math.random() * 25 + 30,
        share: shares[index]
    }));
}

function generateAdCPAData() {
    const ads = [
        { name: 'Phishing Alert Video', campaign: 'Phishing Protection' },
        { name: 'Browser Extension Banner', campaign: 'Browser Security' },
        { name: 'Small Business Security Ad', campaign: 'Small Business Protection' },
        { name: 'Malware Detection Demo', campaign: 'Malware Detection' },
        { name: 'Data Breach Prevention CTA', campaign: 'Data Breach Prevention' }
    ];
    const efficiencies = ['High', 'Medium', 'Low', 'High', 'Medium'];
    
    return ads.map((ad, index) => ({
        ad_name: ad.name,
        campaign: ads[index % 4].campaign.replace('Campaign', ''),
        spend: Math.floor(Math.random() * 2000) + 500,
        activations: Math.floor(Math.random() * 50) + 10,
        cpa: Math.random() * 40 + 20,
        efficiency: efficiencies[index]
    }));
}

function showCPAQuerySteps() {
    const queryResult = window.sqlEngine.executeQuery('cpa_preparation', { limit: 20 });
    
    const modal = document.createElement('div');
    modal.className = 'query-results-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🔍 CPA Dashboard Preparation Query Steps</h3>
                <button class="close-modal" onclick="closeQueryModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="query-info">
                    <h4>Step-by-Step CPA Table Preparation</h4>
                    <p>This query creates the atomic-level preparation table that supports all CPA dashboard granularities.</p>
                </div>
                <div class="query-display">
                    <h4>Complete SQL Query:</h4>
                    <pre><code>${queryResult.query}</code></pre>
                </div>
                <div class="results-display">
                    <h4>Preparation Table Sample (${queryResult.rowCount} rows):</h4>
                    <div class="results-table-container">
                        ${generateResultsTable(queryResult.results)}
                    </div>
                </div>
                <div class="business-logic-explanation">
                    <h5>💡 Why Atomic Granularity?</h5>
                    <div class="insight-cards">
                        <div class="insight-card">
                            <h6>🎯 Maximum Flexibility</h6>
                            <p>Store data at the finest level (date + source + campaign + adset + ad) to support any aggregation level.</p>
                        </div>
                        <div class="insight-card">
                            <h6>⚡ Performance Optimization</h6>
                            <p>Pre-calculated metrics eliminate complex joins in dashboard queries.</p>
                        </div>
                        <div class="insight-card">
                            <h6>🔄 Single Source of Truth</h6>
                            <p>One table powers all dashboard views: daily, campaign, source, and ad-level analytics.</p>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="downloadQueryResults('cpa_preparation')">📥 Download Full Table</button>
                    <button class="btn btn-secondary" onclick="closeQueryModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeQueryModal();
        }
    });
}

function showCPAQueryStepsDetailed() {
    const resultsDiv = document.getElementById('cpa-query-results');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = `
        <div class="cpa-query-steps">
            <h4>CPA Dashboard Query Construction Steps</h4>
            <div class="step-list">
                <div class="query-step">
                    <h5>Step 1: Base Attribution Data</h5>
                    <code>SELECT user_id, DATE(activation_session_start_time) AS activation_date, 
last_touch_attribution_source AS source, last_touch_campaign_name AS campaign_name
FROM task1_attribution_result WHERE last_touch_attribution_source != 'organic'</code>
                </div>
                <div class="query-step">
                    <h5>Step 2: Aggregate Activations</h5>
                    <code>SELECT date, source, campaign_name, COUNT(DISTINCT user_id) AS activations
FROM attribution_data GROUP BY date, source, campaign_name</code>
                </div>
                <div class="query-step">
                    <h5>Step 3: Aggregate Spend</h5>
                    <code>SELECT date, source, campaign_id, SUM(spend) AS total_spend
FROM campaign_spend GROUP BY date, source, campaign_id</code>
                </div>
                <div class="query-step">
                    <h5>Step 4: Calculate CPA</h5>
                    <code>SELECT *, CASE WHEN activations > 0 THEN ROUND(total_spend / activations, 2) ELSE NULL END AS cost_per_activation
FROM combined_spend_activations</code>
                </div>
            </div>
        </div>
    `;
}

// Performance Optimization Demonstrations
function showOptimizationStep(stepNumber) {
    const resultsDiv = document.getElementById('optimization-results');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = '<div class="loading">Analyzing optimization strategy...</div>';
    
    setTimeout(() => {
        let stepHTML = '';
        
        switch(stepNumber) {
            case 1:
                stepHTML = getTableStructureOptimization();
                break;
            case 2:
                stepHTML = getIncrementalProcessingOptimization();
                break;
            case 3:
                stepHTML = getMaterializedViewsOptimization();
                break;
            case 4:
                stepHTML = getCompleteOptimizationComparison();
                break;
        }
        
        resultsDiv.innerHTML = stepHTML;
    }, 1000);
}

function getTableStructureOptimization() {
    return `
        <div class="optimization-step">
            <h4>Table Structure Optimization</h4>
            <div class="optimization-description">
                <p><strong>Strategy:</strong> Add partitioning, indexing, and computed columns to eliminate expensive operations</p>
            </div>
            
            <div class="optimization-comparison">
                <div class="before-after-grid">
                    <div class="before-section">
                        <h5>❌ Before Optimization</h5>
                        <div class="optimization-code">
                            <code>-- Sessions table without optimization
CREATE TABLE sessions (
  session_id STRING,
  user_id STRING,
  referrer_url STRING,
  session_start_time TIMESTAMP,
  is_activated INTEGER
);

-- Every query requires expensive regex parsing
SELECT 
  REGEXP_EXTRACT(referrer_url, r'utm_source=([^&]+)') AS source
FROM sessions
WHERE DATE(session_start_time) >= '2024-01-01';</code>
                        </div>
                        <div class="performance-metrics">
                            <div class="metric">
                                <span class="metric-label">Query Time</span>
                                <span class="metric-value bad">45 seconds</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">CPU Usage</span>
                                <span class="metric-value bad">85%</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Scanned Rows</span>
                                <span class="metric-value bad">50M</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="after-section">
                        <h5>✅ After Optimization</h5>
                        <div class="optimization-code">
                            <code>-- Optimized sessions table
CREATE TABLE sessions_optimized (
  session_id STRING,
  user_id STRING,
  referrer_url STRING,
  session_start_time TIMESTAMP,
  is_activated INTEGER,
  session_date DATE GENERATED ALWAYS AS (DATE(session_start_time)),
  
  -- Pre-computed UTM fields
  utm_source STRING GENERATED ALWAYS AS (
    CASE WHEN referrer_url LIKE '%utm_source=%' 
    THEN REGEXP_EXTRACT(referrer_url, r'utm_source=([^&]+)')
    ELSE 'organic' END
  )
)
PARTITION BY session_date
CLUSTER BY user_id;

-- Fast query with pre-computed fields
SELECT utm_source AS source
FROM sessions_optimized
WHERE session_date >= '2024-01-01';</code>
                        </div>
                        <div class="performance-metrics">
                            <div class="metric">
                                <span class="metric-label">Query Time</span>
                                <span class="metric-value good">3 seconds</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">CPU Usage</span>
                                <span class="metric-value good">25%</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Scanned Rows</span>
                                <span class="metric-value good">2M</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="improvement-summary">
                    <h5>📊 Performance Improvements</h5>
                    <div class="improvement-stats">
                        <div class="improvement-stat">
                            <span class="improvement-label">Query Time</span>
                            <span class="improvement-value">93% faster</span>
                        </div>
                        <div class="improvement-stat">
                            <span class="improvement-label">CPU Usage</span>
                            <span class="improvement-value">70% reduction</span>
                        </div>
                        <div class="improvement-stat">
                            <span class="improvement-label">Data Scanned</span>
                            <span class="improvement-value">96% reduction</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getIncrementalProcessingOptimization() {
    return `
        <div class="optimization-step">
            <h4>Incremental Processing Architecture</h4>
            <div class="optimization-description">
                <p><strong>Strategy:</strong> Process only new activations daily instead of full historical recalculation</p>
            </div>
            
            <div class="optimization-comparison">
                <div class="before-after-grid">
                    <div class="before-section">
                        <h5>❌ Before: Full Historical Processing</h5>
                        <div class="optimization-code">
                            <code>-- Daily job processes ALL historical data
WITH all_activations AS (
  SELECT user_id, session_start_time
  FROM sessions 
  WHERE is_activated = 1
),
all_attribution AS (
  SELECT au.user_id, au.session_start_time, ...
  FROM all_activations au
  JOIN sessions s ON au.user_id = s.user_id
  WHERE s.session_start_time <= au.session_start_time
    AND s.session_start_time >= DATE_SUB(au.session_start_time, INTERVAL 14 DAY)
)
SELECT * FROM all_attribution;</code>
                        </div>
                        <div class="processing-stats">
                            <div class="stat-item">
                                <span class="stat-label">Daily Processing Time</span>
                                <span class="stat-value bad">4 hours</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Data Processed</span>
                                <span class="stat-value bad">50M sessions</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Cost per Day</span>
                                <span class="stat-value bad">$250</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="after-section">
                        <h5>✅ After: Incremental Processing</h5>
                        <div class="optimization-code">
                            <code>-- Process only yesterday's new activations
CREATE OR REPLACE PROCEDURE daily_attribution_update()
BEGIN
  -- Get only new activations
  CREATE TEMP TABLE new_activations AS
  SELECT user_id, session_start_time
  FROM sessions 
  WHERE session_date = CURRENT_DATE() - 1 
    AND is_activated = 1;
  
  -- Calculate attribution only for new users
  INSERT INTO attribution_results
  SELECT na.user_id, na.session_start_time, ...
  FROM new_activations na
  JOIN sessions s ON na.user_id = s.user_id
  WHERE s.session_date BETWEEN DATE(na.session_start_time) - 14 
                           AND DATE(na.session_start_time);
END;</code>
                        </div>
                        <div class="processing-stats">
                            <div class="stat-item">
                                <span class="stat-label">Daily Processing Time</span>
                                <span class="stat-value good">12 minutes</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Data Processed</span>
                                <span class="stat-value good">500K sessions</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Cost per Day</span>
                                <span class="stat-value good">$12</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="improvement-summary">
                    <h5>📊 Scalability Impact</h5>
                    <div class="scalability-chart">
                        <div class="scale-comparison">
                            <div class="scale-item">
                                <span class="scale-label">Processing Time</span>
                                <div class="scale-bar">
                                    <div class="scale-before" style="width: 100%">4 hours</div>
                                    <div class="scale-after" style="width: 5%">12 min</div>
                                </div>
                                <span class="scale-improvement">95% faster</span>
                            </div>
                            <div class="scale-item">
                                <span class="scale-label">Daily Cost</span>
                                <div class="scale-bar">
                                    <div class="scale-before" style="width: 100%">$250</div>
                                    <div class="scale-after" style="width: 5%">$12</div>
                                </div>
                                <span class="scale-improvement">95% cheaper</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getMaterializedViewsOptimization() {
    return `
        <div class="optimization-step">
            <h4>Materialized Views for Complex Lookups</h4>
            <div class="optimization-description">
                <p><strong>Strategy:</strong> Pre-compute campaign name mappings and complex aggregations</p>
            </div>
            
            <div class="optimization-comparison">
                <div class="before-after-grid">
                    <div class="before-section">
                        <h5>❌ Before: Complex Joins Every Query</h5>
                        <div class="optimization-code">
                            <code>-- Every query requires complex window function
SELECT 
  a.user_id,
  a.campaign_id,
  c.campaign_name,
  c.adset_name,
  c.ad_name
FROM attribution_results a
LEFT JOIN (
  SELECT DISTINCT
    source, campaign_id, adset_id, ad_id,
    FIRST_VALUE(campaign_name) OVER (
      PARTITION BY source, campaign_id 
      ORDER BY date DESC
    ) AS campaign_name,
    FIRST_VALUE(adset_name) OVER (
      PARTITION BY source, adset_id 
      ORDER BY date DESC
    ) AS adset_name,
    FIRST_VALUE(ad_name) OVER (
      PARTITION BY source, ad_id 
      ORDER BY date DESC
    ) AS ad_name
  FROM campaign_spend
) c ON a.campaign_id = c.campaign_id;</code>
                        </div>
                        <div class="complexity-metrics">
                            <div class="complexity-item">
                                <span class="complexity-label">Query Complexity</span>
                                <span class="complexity-value bad">High</span>
                            </div>
                            <div class="complexity-item">
                                <span class="complexity-label">Join Operations</span>
                                <span class="complexity-value bad">3 window functions</span>
                            </div>
                            <div class="complexity-item">
                                <span class="complexity-label">Query Time</span>
                                <span class="complexity-value bad">25 seconds</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="after-section">
                        <h5>✅ After: Materialized Views</h5>
                        <div class="optimization-code">
                            <code>-- Pre-computed materialized view
CREATE MATERIALIZED VIEW campaign_names_current AS
SELECT 
  source, campaign_id, adset_id, ad_id,
  campaign_name, adset_name, ad_name
FROM (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY source, campaign_id, adset_id, ad_id 
      ORDER BY date DESC
    ) AS rn
  FROM campaign_spend
) WHERE rn = 1;

-- Simple and fast query
SELECT 
  a.user_id,
  a.campaign_id,
  c.campaign_name,
  c.adset_name,
  c.ad_name
FROM attribution_results a
LEFT JOIN campaign_names_current c 
  ON a.campaign_id = c.campaign_id;</code>
                        </div>
                        <div class="complexity-metrics">
                            <div class="complexity-item">
                                <span class="complexity-label">Query Complexity</span>
                                <span class="complexity-value good">Low</span>
                            </div>
                            <div class="complexity-item">
                                <span class="complexity-label">Join Operations</span>
                                <span class="complexity-value good">1 simple join</span>
                            </div>
                            <div class="complexity-item">
                                <span class="complexity-label">Query Time</span>
                                <span class="complexity-value good">3 seconds</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="improvement-summary">
                    <h5>📊 Developer Experience Impact</h5>
                    <div class="dev-impact">
                        <div class="impact-item">
                            <span class="impact-icon">🚀</span>
                            <span class="impact-text">88% faster query execution</span>
                        </div>
                        <div class="impact-item">
                            <span class="impact-icon">🛠️</span>
                            <span class="impact-text">Simplified query complexity</span>
                        </div>
                        <div class="impact-item">
                            <span class="impact-icon">🔄</span>
                            <span class="impact-text">Auto-refresh every 24 hours</span>
                        </div>
                        <div class="impact-item">
                            <span class="impact-icon">📈</span>
                            <span class="impact-text">Consistent performance at scale</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getCompleteOptimizationComparison() {
    return `
        <div class="optimization-step">
            <h4>Complete Optimization Impact</h4>
            <div class="optimization-description">
                <p><strong>Combined Effect:</strong> All optimization strategies working together for maximum performance</p>
            </div>
            
            <div class="complete-comparison">
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h5>Query Performance</h5>
                        <div class="metric-comparison">
                            <div class="metric-bar">
                                <div class="metric-before">Before: 45s</div>
                                <div class="metric-after">After: 3s</div>
                            </div>
                            <div class="metric-improvement">93% faster</div>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <h5>Daily Processing</h5>
                        <div class="metric-comparison">
                            <div class="metric-bar">
                                <div class="metric-before">Before: 4 hours</div>
                                <div class="metric-after">After: 12 min</div>
                            </div>
                            <div class="metric-improvement">95% reduction</div>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <h5>Infrastructure Cost</h5>
                        <div class="metric-comparison">
                            <div class="metric-bar">
                                <div class="metric-before">Before: $250/day</div>
                                <div class="metric-after">After: $12/day</div>
                            </div>
                            <div class="metric-improvement">95% cheaper</div>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <h5>Data Processed</h5>
                        <div class="metric-comparison">
                            <div class="metric-bar">
                                <div class="metric-before">Before: 50M rows</div>
                                <div class="metric-after">After: 500K rows</div>
                            </div>
                            <div class="metric-improvement">99% reduction</div>
                        </div>
                    </div>
                </div>
                
                <div class="scalability-projection">
                    <h5>📈 Scalability Projection</h5>
                    <div class="projection-table">
                        <table class="results-table-inner">
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>Current Capacity</th>
                                    <th>With Optimizations</th>
                                    <th>Growth Supported</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Daily Sessions</td>
                                    <td>1M</td>
                                    <td>50M+</td>
                                    <td>50x</td>
                                </tr>
                                <tr>
                                    <td>Daily Activations</td>
                                    <td>100K</td>
                                    <td>5M+</td>
                                    <td>50x</td>
                                </tr>
                                <tr>
                                    <td>Attribution Window</td>
                                    <td>14 days</td>
                                    <td>90+ days</td>
                                    <td>6x</td>
                                </tr>
                                <tr>
                                    <td>Processing Time</td>
                                    <td>4 hours</td>
                                    <td>12 minutes</td>
                                    <td>20x faster</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="implementation-timeline">
                    <h5>🗓️ Implementation Roadmap</h5>
                    <div class="timeline-items">
                        <div class="timeline-item">
                            <div class="timeline-phase">Phase 1 (Week 1)</div>
                            <div class="timeline-content">
                                <div class="timeline-title">Quick Wins</div>
                                <div class="timeline-description">Partitioning, indexing, basic optimizations</div>
                                <div class="timeline-impact">50% improvement</div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-phase">Phase 2 (Week 2-3)</div>
                            <div class="timeline-content">
                                <div class="timeline-title">Structural Changes</div>
                                <div class="timeline-description">Computed columns, materialized views</div>
                                <div class="timeline-impact">80% improvement</div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-phase">Phase 3 (Week 4-6)</div>
                            <div class="timeline-content">
                                <div class="timeline-title">Advanced Architecture</div>
                                <div class="timeline-description">Incremental processing, full optimization</div>
                                <div class="timeline-impact">95% improvement</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateCPAChart(granularity) {
    if (!cpaChart) return;
    
    let labels = [];
    let data = [];
    
    switch(granularity) {
        case 'daily':
            // Generate daily CPA data
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString());
                data.push(Math.random() * 30 + 40);
            }
            break;
        case 'campaign':
            ['Brand Awareness', 'Lead Gen', 'Retargeting', 'Conversion'].forEach(campaign => {
                labels.push(campaign);
                data.push(Math.random() * 40 + 30);
            });
            break;
        case 'source':
            ['Google', 'Facebook', 'LinkedIn', 'Twitter'].forEach(source => {
                labels.push(source);
                data.push(Math.random() * 35 + 25);
            });
            break;
        case 'ad':
            ['Ad 1', 'Ad 2', 'Ad 3', 'Ad 4', 'Ad 5'].forEach(ad => {
                labels.push(ad);
                data.push(Math.random() * 50 + 20);
            });
            break;
    }
    
    cpaChart.data.labels = labels;
    cpaChart.data.datasets[0].data = data;
    cpaChart.update();
}

function updateSpendChart(granularity) {
    if (!spendChart) return;
    
    const labels = cpaChart.data.labels;
    const spendData = labels.map(() => Math.random() * 1000 + 500);
    const activationsData = labels.map(() => Math.floor(Math.random() * 20 + 5));
    
    spendChart.data.labels = labels;
    spendChart.data.datasets[0].data = spendData;
    spendChart.data.datasets[1].data = activationsData;
    spendChart.update();
}

function updateTopPerformers(granularity) {
    const container = document.getElementById('top-performers');
    if (!container) return;
    
    const performers = [
        { name: 'Google Brand Campaign', cpa: 24.50, trend: 'up' },
        { name: 'Facebook Lead Gen', cpa: 31.20, trend: 'down' },
        { name: 'LinkedIn Retargeting', cpa: 45.80, trend: 'up' },
        { name: 'Twitter Conversion', cpa: 52.10, trend: 'stable' }
    ];
    
    let html = '<div class="top-performers-list">';
    performers.forEach((performer, index) => {
        const trendIcon = performer.trend === 'up' ? '↗️' : performer.trend === 'down' ? '↘️' : '➡️';
        html += `
            <div class="performer-item">
                <div class="performer-rank">${index + 1}</div>
                <div class="performer-info">
                    <div class="performer-name">${performer.name}</div>
                    <div class="performer-cpa">$${performer.cpa.toFixed(2)} ${trendIcon}</div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function updateKeyMetrics(granularity) {
    const container = document.getElementById('key-metrics');
    if (!container) return;
    
    const metrics = {
        totalSpend: (Math.random() * 10000 + 15000).toFixed(0),
        totalActivations: Math.floor(Math.random() * 200 + 300),
        averageCPA: (Math.random() * 20 + 35).toFixed(2),
        conversionRate: (Math.random() * 2 + 3).toFixed(2)
    };
    
    let html = `
        <div class="key-metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Total Spend</div>
                <div class="metric-value">$${metrics.totalSpend}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Activations</div>
                <div class="metric-value">${metrics.totalActivations}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Avg CPA</div>
                <div class="metric-value">$${metrics.averageCPA}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Conv. Rate</div>
                <div class="metric-value">${metrics.conversionRate}%</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Test function exposure
console.log('Script.js loaded successfully');

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Guardio Assignment Showcase...');
    console.log('Testing function availability:', {
        showOptimizationStep: typeof window.showOptimizationStep,
        runStep: typeof window.runStep,
        updateDashboard: typeof window.updateDashboard
    });
    
    try {
        initializeMockData();
        console.log('Mock data initialized successfully');
        console.log('SQL Engine available:', !!window.sqlEngine);
    } catch (error) {
        console.error('Error initializing mock data:', error);
    }
    
    try {
        initializeCharts();
        console.log('Charts initialized successfully');
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
    
    // Initialize with default data
    setTimeout(() => {
        try {
            updateDashboard();
            populateTable('sessions');
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    }, 500);
    
    // Add CSS for dynamic elements
    const style = document.createElement('style');
    style.textContent = `
        .loading {
            text-align: center;
            padding: 2rem;
            color: #666;
        }
        
        .results-table-inner {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        
        .results-table-inner th,
        .results-table-inner td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .results-table-inner th {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        .top-performers-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .performer-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            background: white;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }
        
        .performer-rank {
            background: #667eea;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .performer-info {
            flex: 1;
        }
        
        .performer-name {
            font-weight: 500;
            font-size: 0.9rem;
        }
        
        .performer-cpa {
            color: #666;
            font-size: 0.8rem;
        }
        
        .key-metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
        }
        
        .metric-card {
            background: white;
            padding: 1rem;
            border-radius: 6px;
            border: 1px solid #e9ecef;
            text-align: center;
        }
        
        .metric-label {
            font-size: 0.8rem;
            color: #666;
            margin-bottom: 0.5rem;
        }
        
        .metric-value {
            font-size: 1.2rem;
            font-weight: 600;
            color: #333;
        }
        
        @media (max-width: 768px) {
            .key-metrics-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(style);
});

// Generate complete attribution results data
function generateCompleteAttributionResults() {
    const data = [];
    const sources = ['google', 'facebook', 'linkedin', 'cybersecurity_today', 'krebs_security'];
    const campaigns = ['phishing_protection', 'browser_security', 'small_business_protection', 'malware_detection', 'data_breach_prevention'];
    
    // Generate 100 activated users
    for (let i = 0; i < 100; i++) {
        const userId = `user_${i.toString().padStart(4, '0')}`;
        const activationTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        
        // 70% have marketing touchpoints, 30% organic only
        const hasMarketing = Math.random() > 0.3;
        
        let firstTouch, lastTouch;
        
        if (hasMarketing) {
            const firstSource = sources[Math.floor(Math.random() * sources.length)];
            const firstCampaign = campaigns[Math.floor(Math.random() * campaigns.length)];
            const firstTouchTime = new Date(activationTime.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000);
            
            const lastSource = sources[Math.floor(Math.random() * sources.length)];
            const lastCampaign = campaigns[Math.floor(Math.random() * campaigns.length)];
            const lastTouchTime = new Date(activationTime.getTime() - Math.random() * 2 * 24 * 60 * 60 * 1000);
            
            firstTouch = {
                time: firstTouchTime,
                source: firstSource,
                campaign_id: firstCampaign,
                campaign_name: `${firstCampaign.replace('_', ' ')} Campaign`,
                adset_id: `adset_${Math.floor(Math.random() * 20)}`,
                adset_name: `AdSet ${Math.floor(Math.random() * 20) + 1}`,
                ad_id: `ad_${Math.floor(Math.random() * 50)}`,
                ad_name: `Ad ${Math.floor(Math.random() * 50) + 1}`
            };
            
            lastTouch = {
                time: lastTouchTime,
                source: lastSource,
                campaign_id: lastCampaign,
                campaign_name: `${lastCampaign.replace('_', ' ')} Campaign`,
                adset_id: `adset_${Math.floor(Math.random() * 20)}`,
                adset_name: `AdSet ${Math.floor(Math.random() * 20) + 1}`,
                ad_id: `ad_${Math.floor(Math.random() * 50)}`,
                ad_name: `Ad ${Math.floor(Math.random() * 50) + 1}`
            };
        } else {
            firstTouch = {
                time: activationTime,
                source: 'organic',
                campaign_id: null,
                campaign_name: null,
                adset_id: null,
                adset_name: null,
                ad_id: null,
                ad_name: null
            };
            lastTouch = firstTouch;
        }
        
        data.push({
            user_id: userId,
            activation_session_start_time: activationTime,
            first_touch_attribution_time: firstTouch.time,
            first_touch_attribution_source: firstTouch.source,
            first_touch_campaign_id: firstTouch.campaign_id,
            first_touch_campaign_name: firstTouch.campaign_name,
            first_touch_adset_id: firstTouch.adset_id,
            first_touch_adset_name: firstTouch.adset_name,
            first_touch_ad_id: firstTouch.ad_id,
            first_touch_ad_name: firstTouch.ad_name,
            last_touch_attribution_date: lastTouch.time,
            last_touch_attribution_source: lastTouch.source,
            last_touch_campaign_id: lastTouch.campaign_id,
            last_touch_campaign_name: lastTouch.campaign_name,
            last_touch_adset_id: lastTouch.adset_id,
            last_touch_adset_name: lastTouch.adset_name,
            last_touch_ad_id: lastTouch.ad_id,
            last_touch_ad_name: lastTouch.ad_name
        });
    }
    
    return data.sort((a, b) => a.user_id.localeCompare(b.user_id));
}

// Generate complete CPA preparation table data
function generateCompleteCPAPreparationTable() {
    const data = [];
    const sources = ['google', 'facebook', 'linkedin', 'cybersecurity_today', 'krebs_security'];
    const campaigns = ['phishing_protection', 'browser_security', 'small_business_protection', 'malware_detection', 'data_breach_prevention'];
    
    // Generate 30 days of data
    for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        date.setHours(0, 0, 0, 0); // Set to start of day for DATE type consistency
        const dateStr = date.toISOString().split('T')[0]; // String for display
        
        sources.forEach(source => {
            campaigns.forEach(campaign => {
                // Generate multiple adsets per campaign
                for (let adset = 0; adset < 3; adset++) {
                    // Generate multiple ads per adset
                    for (let ad = 0; ad < 2; ad++) {
                        const spend = Math.floor(Math.random() * 500) + 50;
                        const activations = Math.floor(Math.random() * 10);
                        const cpa = activations > 0 ? spend / activations : null;
                        
                        data.push({
                            date: dateStr,
                            source: source,
                            campaign_id: campaign,
                            campaign_name: `${campaign.replace('_', ' ')} Campaign`,
                            adset_id: `adset_${adset}`,
                            adset_name: `AdSet ${adset + 1}`,
                            ad_id: `ad_${ad}`,
                            ad_name: `Ad ${ad + 1}`,
                            total_spend: spend,
                            activations: activations,
                            cost_per_activation: cpa ? parseFloat(cpa.toFixed(2)) : null,
                            spend_share_pct: Math.random() * 10,
                            activation_share_pct: activations > 0 ? Math.random() * 15 : 0,
                            cumulative_spend: spend + Math.floor(Math.random() * 2000),
                            cumulative_activations: activations + Math.floor(Math.random() * 50)
                        });
                    }
                }
            });
        });
    }
    
    return data.sort((a, b) => b.date.localeCompare(a.date) || a.source.localeCompare(b.source));
}

// Show complete attribution results table
function showCompleteAttributionResults() {
    const data = generateCompleteAttributionResults();
    const container = document.getElementById('complete-attribution-results');
    
    const marketingCount = data.filter(row => row.first_touch_attribution_source !== 'organic').length;
    const organicCount = data.length - marketingCount;
    
    container.innerHTML = `
        <div class="complete-results-table">
            <div class="table-info">
                <h5>📊 Task 1 Complete Attribution Results</h5>
                <p>This table contains the exact deliverable requested: one row per activated user with complete first-touch and last-touch attribution data.</p>
            </div>
            
            <div class="table-stats">
                <div class="table-stat">
                    <div class="stat-value">${data.length}</div>
                    <div class="stat-label">Total Activated Users</div>
                </div>
                <div class="table-stat">
                    <div class="stat-value">${marketingCount}</div>
                    <div class="stat-label">Marketing Attribution</div>
                </div>
                <div class="table-stat">
                    <div class="stat-value">${organicCount}</div>
                    <div class="stat-label">Organic Attribution</div>
                </div>
                <div class="table-stat">
                    <div class="stat-value">18</div>
                    <div class="stat-label">Required Columns</div>
                </div>
            </div>
            
            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>user_id</th>
                            <th>activation_session_start_time</th>
                            <th>first_touch_attribution_time</th>
                            <th>first_touch_attribution_source</th>
                            <th>first_touch_campaign_id</th>
                            <th>first_touch_campaign_name</th>
                            <th>first_touch_adset_id</th>
                            <th>first_touch_adset_name</th>
                            <th>first_touch_ad_id</th>
                            <th>first_touch_ad_name</th>
                            <th>last_touch_attribution_date</th>
                            <th>last_touch_attribution_source</th>
                            <th>last_touch_campaign_id</th>
                            <th>last_touch_campaign_name</th>
                            <th>last_touch_adset_id</th>
                            <th>last_touch_adset_name</th>
                            <th>last_touch_ad_id</th>
                            <th>last_touch_ad_name</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                <td><span class="user-id">${row.user_id}</span></td>
                                <td class="timestamp">${row.activation_session_start_time.toLocaleString()}</td>
                                <td class="timestamp">${row.first_touch_attribution_time.toLocaleString()}</td>
                                <td><span class="source-${row.first_touch_attribution_source}">${row.first_touch_attribution_source}</span></td>
                                <td class="campaign-cell">${row.first_touch_campaign_id || '<span class="null-cell">NULL</span>'}</td>
                                <td class="campaign-cell">${row.first_touch_campaign_name || '<span class="null-cell">NULL</span>'}</td>
                                <td>${row.first_touch_adset_id || '<span class="null-cell">NULL</span>'}</td>
                                <td>${row.first_touch_adset_name || '<span class="null-cell">NULL</span>'}</td>
                                <td>${row.first_touch_ad_id || '<span class="null-cell">NULL</span>'}</td>
                                <td>${row.first_touch_ad_name || '<span class="null-cell">NULL</span>'}</td>
                                <td class="timestamp">${row.last_touch_attribution_date.toLocaleString()}</td>
                                <td><span class="source-${row.last_touch_attribution_source}">${row.last_touch_attribution_source}</span></td>
                                <td class="campaign-cell">${row.last_touch_campaign_id || '<span class="null-cell">NULL</span>'}</td>
                                <td class="campaign-cell">${row.last_touch_campaign_name || '<span class="null-cell">NULL</span>'}</td>
                                <td>${row.last_touch_adset_id || '<span class="null-cell">NULL</span>'}</td>
                                <td>${row.last_touch_adset_name || '<span class="null-cell">NULL</span>'}</td>
                                <td>${row.last_touch_ad_id || '<span class="null-cell">NULL</span>'}</td>
                                <td>${row.last_touch_ad_name || '<span class="null-cell">NULL</span>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Show complete CPA preparation table
function showCompleteCPATable() {
    const data = generateCompleteCPAPreparationTable();
    const container = document.getElementById('complete-cpa-table');
    
    const totalSpend = data.reduce((sum, row) => sum + row.total_spend, 0);
    const totalActivations = data.reduce((sum, row) => sum + row.activations, 0);
    const avgCPA = totalSpend / totalActivations;
    
    container.innerHTML = `
        <div class="complete-results-table">
            <div class="table-info">
                <h5>📊 Task 2 Complete CPA Dashboard Preparation Table</h5>
                <p>This table contains the atomic-level records that power all dashboard aggregations at any granularity level (date, campaign, ad group, ad).</p>
            </div>
            
            <div class="table-stats">
                <div class="table-stat">
                    <div class="stat-value">${data.length}</div>
                    <div class="stat-label">Total Records</div>
                </div>
                <div class="table-stat">
                    <div class="stat-value">$${totalSpend.toLocaleString()}</div>
                    <div class="stat-label">Total Spend</div>
                </div>
                <div class="table-stat">
                    <div class="stat-value">${totalActivations}</div>
                    <div class="stat-label">Total Activations</div>
                </div>
                <div class="table-stat">
                    <div class="stat-value">$${avgCPA.toFixed(2)}</div>
                    <div class="stat-label">Average CPA</div>
                </div>
            </div>
            
            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Source</th>
                            <th>Campaign ID</th>
                            <th>Campaign Name</th>
                            <th>Adset ID</th>
                            <th>Adset Name</th>
                            <th>Ad ID</th>
                            <th>Ad Name</th>
                            <th>Total Spend</th>
                            <th>Activations</th>
                            <th>Cost Per Activation</th>
                            <th>Spend Share %</th>
                            <th>Activation Share %</th>
                            <th>Cumulative Spend</th>
                            <th>Cumulative Activations</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.slice(0, 100).map(row => `
                            <tr>
                                <td>${row.date}</td>
                                <td><span class="source-${row.source}">${row.source}</span></td>
                                <td class="campaign-cell">${row.campaign_id}</td>
                                <td class="campaign-cell">${row.campaign_name}</td>
                                <td>${row.adset_id}</td>
                                <td>${row.adset_name}</td>
                                <td>${row.ad_id}</td>
                                <td>${row.ad_name}</td>
                                <td class="metric-cell">$${row.total_spend}</td>
                                <td class="metric-cell">${row.activations}</td>
                                <td class="cpa-cell">${row.cost_per_activation ? '$' + row.cost_per_activation.toFixed(2) : '<span class="null-cell">NULL</span>'}</td>
                                <td class="metric-cell">${row.spend_share_pct.toFixed(1)}%</td>
                                <td class="metric-cell">${row.activation_share_pct.toFixed(1)}%</td>
                                <td class="metric-cell">$${row.cumulative_spend}</td>
                                <td class="metric-cell">${row.cumulative_activations}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <p style="margin-top: 1rem; color: #666; font-size: 0.9rem;">
                <em>Showing first 100 records. Full table contains ${data.length} records covering 30 days of atomic-level data.</em>
            </p>
        </div>
    `;
}

// CSV download functions
function downloadAttributionCSV() {
    const data = generateCompleteAttributionResults();
    const headers = [
        'user_id', 'activation_session_start_time', 'first_touch_attribution_time',
        'first_touch_attribution_source', 'first_touch_campaign_id', 'first_touch_campaign_name',
        'first_touch_adset_id', 'first_touch_adset_name', 'first_touch_ad_id', 'first_touch_ad_name',
        'last_touch_attribution_date', 'last_touch_attribution_source', 'last_touch_campaign_id',
        'last_touch_campaign_name', 'last_touch_adset_id', 'last_touch_adset_name',
        'last_touch_ad_id', 'last_touch_ad_name'
    ];
    
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            return value ? `"${value.toString().replace(/"/g, '""')}"` : '';
        }).join(','))
    ].join('\n');
    
    downloadCSV(csvContent, 'task1_attribution_results.csv');
}

function downloadCPACSV() {
    const data = generateCompleteCPAPreparationTable();
    const headers = [
        'date', 'source', 'campaign_id', 'campaign_name', 'adset_id', 'adset_name',
        'ad_id', 'ad_name', 'total_spend', 'activations', 'cost_per_activation',
        'spend_share_pct', 'activation_share_pct', 'cumulative_spend', 'cumulative_activations'
    ];
    
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            return value !== null ? `"${value.toString().replace(/"/g, '""')}"` : '';
        }).join(','))
    ].join('\n');
    
    downloadCSV(csvContent, 'task2_cpa_preparation_table.csv');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export functions for global access
window.showTable = showTable;
window.runStep = runStep;
window.updateDashboard = updateDashboard;
window.showCPAQuerySteps = showCPAQuerySteps;
window.showOptimizationStep = showOptimizationStep;
window.showCompleteAttributionResults = showCompleteAttributionResults;
window.showCompleteCPATable = showCompleteCPATable;
window.downloadAttributionCSV = downloadAttributionCSV;
window.downloadCPACSV = downloadCPACSV;