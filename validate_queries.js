// Quick validation script for SQL queries
// Run this in browser console to test all queries

function validateAllQueries() {
    console.log('🔍 Starting Query Validation...');
    
    if (!window.sqlEngine) {
        console.error('❌ SQL Engine not initialized');
        return false;
    }
    
    const testQueries = [
        { type: 'parse_sessions', name: 'Parse Sessions', limit: 5 },
        { type: 'activated_users', name: 'Activated Users', limit: 5 },
        { type: 'attribution_window', name: 'Attribution Window', limit: 5 },
        { type: 'final_attribution', name: 'Final Attribution', limit: 5 },
        { type: 'complete_attribution', name: 'Complete Attribution', limit: 10 },
        { type: 'cpa_daily', name: 'Daily CPA', limit: 7 },
        { type: 'cpa_campaign', name: 'Campaign CPA', limit: 10 },
        { type: 'cpa_source', name: 'Source CPA', limit: 10 },
        { type: 'cpa_ad', name: 'Ad CPA', limit: 10 },
        { type: 'cpa_preparation', name: 'CPA Preparation', limit: 20 }
    ];
    
    let passedTests = 0;
    let totalTests = testQueries.length;
    
    testQueries.forEach((test, index) => {
        try {
            console.log(`\n${index + 1}. Testing ${test.name}...`);
            
            const result = window.sqlEngine.executeQuery(test.type, { limit: test.limit });
            
            // Validate result structure
            if (!result.query) {
                throw new Error('Missing query property');
            }
            if (!Array.isArray(result.results)) {
                throw new Error('Results is not an array');
            }
            if (typeof result.rowCount !== 'number') {
                throw new Error('Invalid rowCount');
            }
            
            // Check for results
            if (result.results.length === 0) {
                console.warn(`⚠️ ${test.name}: No results returned`);
            } else {
                console.log(`✅ ${test.name}: ${result.results.length} rows returned`);
                
                // Show sample data structure
                const sampleRow = result.results[0];
                console.log(`   Sample row keys: ${Object.keys(sampleRow).join(', ')}`);
                
                // Show top metrics if available
                if (result.topMetrics) {
                    console.log(`   Top metrics: ${Object.keys(result.topMetrics).join(', ')}`);
                }
            }
            
            passedTests++;
            
        } catch (error) {
            console.error(`❌ ${test.name} failed:`, error.message);
        }
    });
    
    console.log(`\n📊 Validation Summary: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All queries validated successfully!');
        return true;
    } else {
        console.log('⚠️ Some queries failed validation');
        return false;
    }
}

// Test data quality
function validateDataQuality() {
    console.log('\n🔍 Validating Data Quality...');
    
    const data = window.sqlEngine.data;
    
    // Test sessions data
    console.log(`Sessions: ${data.sessions.length} records`);
    const activatedSessions = data.sessions.filter(s => s.is_activated === 1);
    console.log(`Activations: ${activatedSessions.length} records`);
    
    // Test campaign spend data
    console.log(`Campaign Spend: ${data.campaignSpend.length} records`);
    const uniqueCampaigns = new Set(data.campaignSpend.map(s => s.campaign_name)).size;
    console.log(`Unique Campaigns: ${uniqueCampaigns}`);
    
    // Test attribution results
    console.log(`Attribution Results: ${data.attributionResults.length} records`);
    const marketingAttribution = data.attributionResults.filter(a => a.first_touch_attribution_source !== 'organic').length;
    console.log(`Marketing Attribution: ${marketingAttribution} records`);
    
    // Test data correlations
    const expectedActivations = activatedSessions.length;
    const actualAttributions = data.attributionResults.length;
    
    if (expectedActivations === actualAttributions) {
        console.log('✅ Data correlation check passed');
        return true;
    } else {
        console.error(`❌ Data correlation issue: ${expectedActivations} activations vs ${actualAttributions} attributions`);
        return false;
    }
}

// Run validation when called
if (typeof window !== 'undefined') {
    console.log('Query validation script loaded. Run validateAllQueries() to test.');
}