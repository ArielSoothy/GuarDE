// Mock Data Generation
const mockData = {
    sessions: [],
    campaignSpend: [],
    attributionResults: []
};

// Initialize mock data
function initializeMockData() {
    // Generate sessions data
    const sources = ['google', 'facebook', 'linkedin', 'twitter'];
    const campaigns = ['brand_awareness', 'lead_gen', 'retargeting', 'conversion'];
    const devices = ['mobile', 'desktop', 'tablet'];
    
    for (let i = 0; i < 1000; i++) {
        const isMarketing = Math.random() > 0.7;
        const source = isMarketing ? sources[Math.floor(Math.random() * sources.length)] : 'organic';
        const campaign = isMarketing ? campaigns[Math.floor(Math.random() * campaigns.length)] : null;
        
        mockData.sessions.push({
            session_id: `sess_${i.toString().padStart(6, '0')}`,
            user_id: `user_${Math.floor(Math.random() * 500).toString().padStart(4, '0')}`,
            device_type: devices[Math.floor(Math.random() * devices.length)],
            session_start_time: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            referrer_url: isMarketing ? 
                `https://guard.io/?utm_source=${source}&utm_campaign=${campaign}&utm_adset=adset_${Math.floor(Math.random() * 20)}&utm_ad=ad_${Math.floor(Math.random() * 50)}` :
                'https://guard.io/',
            is_activated: Math.random() > 0.95 ? 1 : 0,
            source: source,
            campaign_id: campaign
        });
    }
    
    // Generate campaign spend data
    const dates = [];
    for (let i = 0; i < 30; i++) {
        dates.push(new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    }
    
    sources.forEach(source => {
        campaigns.forEach(campaign => {
            for (let i = 0; i < 10; i++) {
                dates.forEach(date => {
                    mockData.campaignSpend.push({
                        date: date,
                        source: source,
                        campaign_id: campaign,
                        campaign_name: `${campaign.replace('_', ' ')} Campaign`,
                        adset_id: `adset_${i}`,
                        adset_name: `AdSet ${i + 1}`,
                        ad_id: `ad_${i}_${Math.floor(Math.random() * 5)}`,
                        ad_name: `Ad ${i + 1}-${Math.floor(Math.random() * 5)}`,
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
        const marketingSessions = userSessions.filter(s => s.source !== 'organic');
        
        const hasMarketing = marketingSessions.length > 0;
        const firstTouch = hasMarketing ? marketingSessions[0] : user;
        const lastTouch = hasMarketing ? marketingSessions[marketingSessions.length - 1] : user;
        
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
}

// Chart configurations
let cpaChart, spendChart, performanceChart;

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
        tableHTML += `<th>${header.replace('_', ' ').toUpperCase()}</th>`;
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
    const sampleSessions = mockData.sessions.slice(0, 8);
    
    let html = `
        <div class="step-result">
            <h4>Step 1: Parse UTM Parameters from referrer_url</h4>
            <div class="step-description">
                <p>Extract marketing source, campaign, adset, and ad parameters from URLs using REGEXP_EXTRACT.</p>
                <code>CASE WHEN referrer_url LIKE '%utm_source=%' THEN REGEXP_EXTRACT(referrer_url, r'utm_source=([^&]+)') ELSE 'organic' END</code>
            </div>
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>Session ID</th>
                        <th>User ID</th>
                        <th>Referrer URL</th>
                        <th>Parsed Source</th>
                        <th>Campaign ID</th>
                        <th>Is Activated</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    sampleSessions.forEach(session => {
        const shortUrl = session.referrer_url.length > 50 ? 
            session.referrer_url.substring(0, 50) + '...' : 
            session.referrer_url;
        
        html += `
            <tr>
                <td>${session.session_id}</td>
                <td>${session.user_id}</td>
                <td title="${session.referrer_url}">${shortUrl}</td>
                <td><span class="source-${session.source}">${session.source}</span></td>
                <td>${session.campaign_id || 'NULL'}</td>
                <td>${session.is_activated ? 'Yes' : 'No'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

function getStep2Results() {
    const activatedSessions = mockData.sessions.filter(s => s.is_activated === 1).slice(0, 6);
    
    let html = `
        <div class="step-result">
            <h4>Step 2: Identify Activated Users & Attribution Windows</h4>
            <div class="step-description">
                <p>Find users who activated (is_activated = 1) and calculate their 14-day attribution window.</p>
                <code>DATE_SUB(DATE(session_start_time), INTERVAL 14 DAY) AS window_start_date</code>
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
    
    activatedSessions.forEach(session => {
        const activationDate = new Date(session.session_start_time);
        const windowStart = new Date(activationDate);
        windowStart.setDate(windowStart.getDate() - 14);
        
        html += `
            <tr>
                <td>${session.user_id}</td>
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
    const sampleData = mockData.sessions.slice(0, 10);
    
    let html = `
        <div class="step-result">
            <h4>Step 3: Attribution Window Analysis</h4>
            <div class="step-description">
                <p>For each activated user, collect all their sessions within the 14-day attribution window.</p>
                <code>WHERE DATE(ps.session_start_time) BETWEEN au.window_start_date AND au.activation_date</code>
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
    
    sampleData.forEach((session, index) => {
        const daysBefore = Math.floor(Math.random() * 14);
        const touchType = session.source === 'organic' ? 'Organic' : 'Marketing';
        
        html += `
            <tr>
                <td>${session.user_id}</td>
                <td>${new Date(session.session_start_time).toLocaleDateString()}</td>
                <td><span class="source-${session.source}">${session.source}</span></td>
                <td>${session.campaign_id || 'N/A'}</td>
                <td>${daysBefore}</td>
                <td><span class="touch-${touchType.toLowerCase()}">${touchType}</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

function getStep4Results() {
    const sampleResults = mockData.attributionResults.slice(0, 6);
    
    let html = `
        <div class="step-result">
            <h4>Step 4: Final Attribution Assignment</h4>
            <div class="step-description">
                <p>Apply attribution logic: If user has ANY marketing touchpoints → use marketing for first/last touch, otherwise organic.</p>
                <code>CASE WHEN uts.marketing_touchpoints > 0 THEN mt.first_touch_source ELSE 'organic' END</code>
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
    
    sampleResults.forEach(result => {
        const hasMarketing = result.first_touch_attribution_source !== 'organic';
        
        html += `
            <tr>
                <td>${result.user_id}</td>
                <td><span class="source-${result.first_touch_attribution_source}">${result.first_touch_attribution_source}</span></td>
                <td>${result.first_touch_campaign_id || 'N/A'}</td>
                <td><span class="source-${result.last_touch_attribution_source}">${result.last_touch_attribution_source}</span></td>
                <td>${result.last_touch_campaign_id || 'N/A'}</td>
                <td>${hasMarketing ? 'Yes' : 'No'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

function getStep5Results() {
    const completeResults = mockData.attributionResults.slice(0, 8);
    
    let html = `
        <div class="step-result">
            <h4>Complete Attribution Results</h4>
            <div class="step-description">
                <p>Final output table with all attribution data ready for CPA calculations and reporting.</p>
            </div>
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Activation Time</th>
                        <th>First Touch Source</th>
                        <th>Last Touch Source</th>
                        <th>CPA</th>
                        <th>Attribution Journey</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    completeResults.forEach(result => {
        const journey = result.first_touch_attribution_source === result.last_touch_attribution_source ? 
            'Single Touch' : 'Multi Touch';
        
        html += `
            <tr>
                <td>${result.user_id}</td>
                <td>${new Date(result.activation_session_start_time).toLocaleDateString()}</td>
                <td><span class="source-${result.first_touch_attribution_source}">${result.first_touch_attribution_source}</span></td>
                <td><span class="source-${result.last_touch_attribution_source}">${result.last_touch_attribution_source}</span></td>
                <td>${result.cost_per_activation ? '$' + result.cost_per_activation.toFixed(2) : 'N/A'}</td>
                <td><span class="journey-${journey.toLowerCase().replace(' ', '-')}">${journey}</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

// Dashboard updates
function updateDashboard() {
    const granularity = document.getElementById('granularity-select').value;
    
    // Show query results first
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
        let queryHTML = '';
        
        switch(granularity) {
            case 'daily':
                queryHTML = getDailyCPAResults();
                break;
            case 'campaign':
                queryHTML = getCampaignCPAResults();
                break;
            case 'source':
                queryHTML = getSourceCPAResults();
                break;
            case 'ad':
                queryHTML = getAdCPAResults();
                break;
        }
        
        resultsDiv.innerHTML = queryHTML;
    }, 1000);
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
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Total Spend</th>
                        <th>Activations</th>
                        <th>Daily CPA</th>
                        <th>Trend</th>
                    </tr>
                </thead>
                <tbody>
                    ${dailyData.map(row => `
                        <tr>
                            <td>${row.date}</td>
                            <td>$${row.spend.toLocaleString()}</td>
                            <td>${row.activations}</td>
                            <td>$${row.cpa.toFixed(2)}</td>
                            <td>${row.trend}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
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
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>Campaign Name</th>
                        <th>Total Spend</th>
                        <th>Activations</th>
                        <th>Campaign CPA</th>
                        <th>Performance</th>
                    </tr>
                </thead>
                <tbody>
                    ${campaignData.map(row => `
                        <tr>
                            <td>${row.campaign}</td>
                            <td>$${row.spend.toLocaleString()}</td>
                            <td>${row.activations}</td>
                            <td>$${row.cpa.toFixed(2)}</td>
                            <td><span class="performance-${row.performance.toLowerCase()}">${row.performance}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
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
                            <td>${row.share}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
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
            <table class="results-table-inner">
                <thead>
                    <tr>
                        <th>Ad Name</th>
                        <th>Campaign</th>
                        <th>Spend</th>
                        <th>Activations</th>
                        <th>Ad CPA</th>
                        <th>Efficiency</th>
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
                            <td><span class="efficiency-${row.efficiency.toLowerCase()}">${row.efficiency}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Data generation functions
function generateDailyCPAData() {
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const spend = Math.floor(Math.random() * 2000) + 1000;
        const activations = Math.floor(Math.random() * 40) + 20;
        const cpa = spend / activations;
        const trend = i === 0 ? '📈' : i === 1 ? '📉' : '➡️';
        
        data.push({
            date: date.toLocaleDateString(),
            spend: spend,
            activations: activations,
            cpa: cpa,
            trend: trend
        });
    }
    return data;
}

function generateCampaignCPAData() {
    const campaigns = ['Brand Awareness Campaign', 'Lead Generation Campaign', 'Retargeting Campaign', 'Conversion Campaign'];
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
    const sources = ['google', 'facebook', 'linkedin', 'twitter'];
    const shares = [35, 28, 22, 15];
    
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
        { name: 'Security Banner Ad', campaign: 'Brand Awareness' },
        { name: 'Lead Form Ad', campaign: 'Lead Generation' },
        { name: 'Retargeting Video', campaign: 'Retargeting' },
        { name: 'Conversion CTA', campaign: 'Conversion' },
        { name: 'Product Demo Ad', campaign: 'Brand Awareness' }
    ];
    const efficiencies = ['High', 'Medium', 'Low', 'High', 'Medium'];
    
    return ads.map((ad, index) => ({
        ad_name: ad.name,
        campaign: ad.campaign,
        spend: Math.floor(Math.random() * 2000) + 500,
        activations: Math.floor(Math.random() * 50) + 10,
        cpa: Math.random() * 40 + 20,
        efficiency: efficiencies[index]
    }));
}

function showCPAQuerySteps() {
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

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeMockData();
    initializeCharts();
    
    // Initialize with default data
    setTimeout(() => {
        updateDashboard();
        populateTable('sessions');
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

// Export functions for global access
window.showTable = showTable;
window.runStep = runStep;
window.updateDashboard = updateDashboard;
window.showCPAQuerySteps = showCPAQuerySteps;