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

// Interactive SQL demonstrations
function runAttributionQuery() {
    const resultsDiv = document.getElementById('attribution-results');
    
    // Show loading state
    resultsDiv.innerHTML = '<div class="loading">Running attribution query...</div>';
    
    // Simulate query execution
    setTimeout(() => {
        const sampleResults = mockData.attributionResults.slice(0, 5);
        
        let resultsHTML = '<h4>Attribution Results (Sample)</h4>';
        resultsHTML += '<table class="results-table-inner">';
        resultsHTML += '<thead><tr><th>User ID</th><th>First Touch Source</th><th>Last Touch Source</th><th>CPA</th></tr></thead>';
        resultsHTML += '<tbody>';
        
        sampleResults.forEach(result => {
            resultsHTML += `<tr>
                <td>${result.user_id}</td>
                <td>${result.first_touch_attribution_source}</td>
                <td>${result.last_touch_attribution_source}</td>
                <td>${result.cost_per_activation ? '$' + result.cost_per_activation.toFixed(2) : 'N/A'}</td>
            </tr>`;
        });
        
        resultsHTML += '</tbody></table>';
        resultsDiv.innerHTML = resultsHTML;
    }, 1500);
}

function showSampleData() {
    const resultsDiv = document.getElementById('attribution-results');
    
    const sampleSessions = mockData.sessions.slice(0, 5);
    let resultsHTML = '<h4>Sample Sessions Data</h4>';
    resultsHTML += '<table class="results-table-inner">';
    resultsHTML += '<thead><tr><th>Session ID</th><th>User ID</th><th>Source</th><th>Activated</th></tr></thead>';
    resultsHTML += '<tbody>';
    
    sampleSessions.forEach(session => {
        resultsHTML += `<tr>
            <td>${session.session_id}</td>
            <td>${session.user_id}</td>
            <td>${session.source}</td>
            <td>${session.is_activated ? 'Yes' : 'No'}</td>
        </tr>`;
    });
    
    resultsHTML += '</tbody></table>';
    resultsDiv.innerHTML = resultsHTML;
}

// Dashboard updates
function updateDashboard() {
    const granularity = document.getElementById('granularity-select').value;
    
    // Update CPA chart based on granularity
    updateCPAChart(granularity);
    updateSpendChart(granularity);
    updateTopPerformers(granularity);
    updateKeyMetrics(granularity);
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
window.runAttributionQuery = runAttributionQuery;
window.showSampleData = showSampleData;
window.updateDashboard = updateDashboard;