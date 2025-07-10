/**
 * QA TEST SUITE FOR GUARDIO ASSIGNMENT SHOWCASE
 * 
 * This file contains automated tests that run in the browser console
 * to help identify issues that Claude cannot visually verify.
 * 
 * USAGE:
 * 1. Open the website in your browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire file
 * 5. Run: runFullQATest()
 * 6. Share the results with Claude
 */

// =============================================================================
// GLOBAL TEST UTILITIES
// =============================================================================

const QATestSuite = {
    results: [],
    errors: [],
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        
        console.log(logEntry);
        this.results.push({ timestamp, type, message });
        
        if (type === 'error') {
            this.errors.push({ timestamp, message });
        }
    },
    
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            totalTests: this.results.length,
            errors: this.errors.length,
            success: this.errors.length === 0,
            results: this.results,
            errors: this.errors,
            browserInfo: {
                userAgent: navigator.userAgent,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                pixelRatio: window.devicePixelRatio,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            }
        };
        
        console.log('=== QA TEST REPORT ===');
        console.log(JSON.stringify(report, null, 2));
        
        return report;
    }
};

// =============================================================================
// VISUAL & LAYOUT TESTS
// =============================================================================

function testVisualLayout() {
    QATestSuite.log('Starting visual layout tests...', 'info');
    
    // Test responsive breakpoints
    const breakpoints = [320, 768, 1024, 1200];
    breakpoints.forEach(width => {
        const mediaQuery = window.matchMedia(`(max-width: ${width}px)`);
        QATestSuite.log(`Breakpoint ${width}px: ${mediaQuery.matches ? 'ACTIVE' : 'inactive'}`, 'info');
    });
    
    // Test for horizontal scrollbars
    const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;
    if (hasHorizontalScroll) {
        QATestSuite.log('WARNING: Page has horizontal scrollbar - potential layout issue', 'warning');
    }
    
    // Test table responsiveness
    const tables = document.querySelectorAll('.results-table-inner');
    tables.forEach((table, index) => {
        const tableWidth = table.scrollWidth;
        const containerWidth = table.parentElement.clientWidth;
        
        if (tableWidth > containerWidth) {
            QATestSuite.log(`Table ${index + 1} is wider than container (${tableWidth}px > ${containerWidth}px) - should scroll`, 'info');
        } else {
            QATestSuite.log(`Table ${index + 1} fits in container (${tableWidth}px <= ${containerWidth}px)`, 'info');
        }
    });
    
    // Test for missing images
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
        if (!img.complete || img.naturalWidth === 0) {
            QATestSuite.log(`Image ${index + 1} failed to load: ${img.src}`, 'error');
        }
    });
    
    QATestSuite.log('Visual layout tests completed', 'info');
}

// =============================================================================
// INTERACTIVE ELEMENT TESTS
// =============================================================================

async function testInteractiveElements() {
    QATestSuite.log('Starting interactive element tests...', 'info');
    
    // Test all buttons
    const buttons = document.querySelectorAll('button');
    QATestSuite.log(`Found ${buttons.length} buttons to test`, 'info');
    
    for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const buttonText = button.textContent.trim();
        
        try {
            // Check if button is visible and enabled
            if (button.disabled) {
                QATestSuite.log(`Button "${buttonText}" is disabled`, 'warning');
                continue;
            }
            
            if (button.offsetWidth === 0 || button.offsetHeight === 0) {
                QATestSuite.log(`Button "${buttonText}" is not visible`, 'warning');
                continue;
            }
            
            // Test click event
            QATestSuite.log(`Testing button: "${buttonText}"`, 'info');
            
            // Add temporary click listener to verify events fire
            let clickFired = false;
            const testListener = () => { clickFired = true; };
            button.addEventListener('click', testListener);
            
            // Simulate click
            button.click();
            await QATestSuite.wait(100);
            
            if (!clickFired) {
                QATestSuite.log(`Button "${buttonText}" click event did not fire`, 'error');
            }
            
            button.removeEventListener('click', testListener);
            
        } catch (error) {
            QATestSuite.log(`Error testing button "${buttonText}": ${error.message}`, 'error');
        }
    }
    
    // Test navigation links
    const navLinks = document.querySelectorAll('nav a, .nav a');
    QATestSuite.log(`Found ${navLinks.length} navigation links`, 'info');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            const targetId = href.substring(1);
            const target = document.getElementById(targetId);
            if (!target) {
                QATestSuite.log(`Navigation link "${href}" target not found`, 'error');
            }
        }
    });
    
    QATestSuite.log('Interactive element tests completed', 'info');
}

// =============================================================================
// CHART TESTS
// =============================================================================

function testCharts() {
    QATestSuite.log('Starting chart tests...', 'info');
    
    // Test Chart.js canvases
    const canvases = document.querySelectorAll('canvas');
    QATestSuite.log(`Found ${canvases.length} canvas elements`, 'info');
    
    canvases.forEach((canvas, index) => {
        const canvasId = canvas.id || `canvas-${index}`;
        
        // Check canvas dimensions
        if (canvas.width === 0 || canvas.height === 0) {
            QATestSuite.log(`Chart canvas "${canvasId}" has zero dimensions`, 'error');
        } else {
            QATestSuite.log(`Chart canvas "${canvasId}" dimensions: ${canvas.width}x${canvas.height}`, 'info');
        }
        
        // Check if canvas has content
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = imageData.data.some(channel => channel !== 0);
        
        if (!hasContent) {
            QATestSuite.log(`Chart canvas "${canvasId}" appears to be empty`, 'warning');
        }
    });
    
    // Test Chart.js instances
    if (typeof Chart !== 'undefined' && Chart.instances) {
        QATestSuite.log(`Found ${Chart.instances.length} Chart.js instances`, 'info');
        
        Chart.instances.forEach((chart, index) => {
            if (chart.data && chart.data.datasets) {
                const datasetCount = chart.data.datasets.length;
                const dataPoints = chart.data.datasets.reduce((sum, dataset) => sum + (dataset.data?.length || 0), 0);
                QATestSuite.log(`Chart ${index + 1}: ${datasetCount} datasets, ${dataPoints} data points`, 'info');
            }
        });
    }
    
    QATestSuite.log('Chart tests completed', 'info');
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

function testPerformance() {
    QATestSuite.log('Starting performance tests...', 'info');
    
    // Test page load performance
    if (performance.timing) {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        
        QATestSuite.log(`Page load time: ${loadTime}ms`, loadTime > 5000 ? 'warning' : 'info');
        QATestSuite.log(`DOM ready time: ${domReady}ms`, domReady > 2000 ? 'warning' : 'info');
    }
    
    // Test memory usage (if available)
    if (performance.memory) {
        const memory = performance.memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
        
        QATestSuite.log(`Memory usage: ${usedMB}MB / ${totalMB}MB`, usedMB > 100 ? 'warning' : 'info');
    }
    
    // Test for large DOM
    const elementCount = document.querySelectorAll('*').length;
    QATestSuite.log(`Total DOM elements: ${elementCount}`, elementCount > 5000 ? 'warning' : 'info');
    
    // Test for console errors
    const originalConsoleError = console.error;
    let errorCount = 0;
    console.error = (...args) => {
        errorCount++;
        originalConsoleError.apply(console, args);
    };
    
    setTimeout(() => {
        console.error = originalConsoleError;
        if (errorCount > 0) {
            QATestSuite.log(`Detected ${errorCount} console errors during performance test`, 'error');
        }
    }, 1000);
    
    QATestSuite.log('Performance tests completed', 'info');
}

// =============================================================================
// DATA VALIDATION TESTS
// =============================================================================

function testDataValidation() {
    QATestSuite.log('Starting data validation tests...', 'info');
    
    // Test mock data existence
    if (typeof mockData === 'undefined') {
        QATestSuite.log('mockData is not defined', 'error');
        return;
    }
    
    // Test sessions data
    if (mockData.sessions && Array.isArray(mockData.sessions)) {
        QATestSuite.log(`Found ${mockData.sessions.length} session records`, 'info');
        
        const sampleSession = mockData.sessions[0];
        if (sampleSession) {
            const requiredFields = ['session_id', 'user_id', 'referrer_url', 'is_activated'];
            const missingFields = requiredFields.filter(field => !(field in sampleSession));
            
            if (missingFields.length > 0) {
                QATestSuite.log(`Session data missing fields: ${missingFields.join(', ')}`, 'error');
            }
        }
        
        // Test source parsing
        const undefinedSources = mockData.sessions.filter(s => {
            const parsed = parseSourceFromUrl(s.referrer_url);
            return parsed.source === 'undefined' || parsed.source === undefined;
        });
        
        if (undefinedSources.length > 0) {
            QATestSuite.log(`Found ${undefinedSources.length} sessions with undefined sources`, 'error');
        }
    }
    
    // Test attribution results
    if (mockData.attributionResults && Array.isArray(mockData.attributionResults)) {
        QATestSuite.log(`Found ${mockData.attributionResults.length} attribution records`, 'info');
        
        const undefinedAttributions = mockData.attributionResults.filter(a => 
            a.first_touch_attribution_source === 'undefined' || 
            a.last_touch_attribution_source === 'undefined'
        );
        
        if (undefinedAttributions.length > 0) {
            QATestSuite.log(`Found ${undefinedAttributions.length} attribution records with undefined sources`, 'error');
        }
    }
    
    QATestSuite.log('Data validation tests completed', 'info');
}

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================

function testAccessibility() {
    QATestSuite.log('Starting accessibility tests...', 'info');
    
    // Test for alt text on images
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
        QATestSuite.log(`Found ${imagesWithoutAlt.length} images without alt text`, 'warning');
    }
    
    // Test for keyboard navigation
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    QATestSuite.log(`Found ${focusableElements.length} focusable elements`, 'info');
    
    // Test for color contrast (basic check)
    const elements = document.querySelectorAll('*');
    let lowContrastCount = 0;
    
    for (let i = 0; i < Math.min(elements.length, 100); i++) {
        const el = elements[i];
        const style = window.getComputedStyle(el);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        
        if (color === 'rgb(128, 128, 128)' && backgroundColor === 'rgb(255, 255, 255)') {
            lowContrastCount++;
        }
    }
    
    if (lowContrastCount > 5) {
        QATestSuite.log(`Potential low contrast issues detected`, 'warning');
    }
    
    QATestSuite.log('Accessibility tests completed', 'info');
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runFullQATest() {
    console.clear();
    console.log('🔍 STARTING FULL QA TEST SUITE');
    console.log('=====================================');
    
    QATestSuite.results = [];
    QATestSuite.errors = [];
    
    try {
        // Initialize mock data if not already done
        if (typeof initializeMockData === 'function') {
            initializeMockData();
        }
        
        // Run all test suites
        testVisualLayout();
        await QATestSuite.wait(500);
        
        await testInteractiveElements();
        await QATestSuite.wait(500);
        
        testCharts();
        await QATestSuite.wait(500);
        
        testPerformance();
        await QATestSuite.wait(500);
        
        testDataValidation();
        await QATestSuite.wait(500);
        
        testAccessibility();
        
        // Generate final report
        const report = QATestSuite.generateReport();
        
        console.log('=====================================');
        console.log('🎉 QA TEST SUITE COMPLETED');
        console.log(`Total tests: ${report.totalTests}`);
        console.log(`Errors: ${report.errors}`);
        console.log(`Success: ${report.success ? 'YES' : 'NO'}`);
        
        if (report.errors > 0) {
            console.log('\n❌ ERRORS FOUND:');
            report.errors.forEach(error => {
                console.log(`  - ${error.message}`);
            });
        }
        
        console.log('\n📋 COPY THE REPORT ABOVE AND SHARE WITH CLAUDE');
        
        return report;
        
    } catch (error) {
        QATestSuite.log(`Critical error in test suite: ${error.message}`, 'error');
        console.error('Test suite failed:', error);
        return QATestSuite.generateReport();
    }
}

// =============================================================================
// QUICK TEST FUNCTIONS
// =============================================================================

function quickButtonTest() {
    console.log('🔘 QUICK BUTTON TEST');
    document.querySelectorAll('button').forEach((btn, index) => {
        console.log(`${index + 1}. "${btn.textContent.trim()}" - ${btn.disabled ? 'DISABLED' : 'ENABLED'}`);
    });
}

function quickTableTest() {
    console.log('📊 QUICK TABLE TEST');
    document.querySelectorAll('.results-table-inner').forEach((table, index) => {
        const width = table.scrollWidth;
        const container = table.parentElement.clientWidth;
        console.log(`Table ${index + 1}: ${width}px wide, container: ${container}px ${width > container ? '(SCROLLABLE)' : '(FITS)'}`);
    });
}

function quickChartTest() {
    console.log('📈 QUICK CHART TEST');
    document.querySelectorAll('canvas').forEach((canvas, index) => {
        console.log(`Chart ${index + 1}: ${canvas.width}x${canvas.height}px`);
    });
}

// =============================================================================
// USAGE INSTRUCTIONS
// =============================================================================

console.log(`
🔍 QA TEST SUITE LOADED
=======================

Available commands:
• runFullQATest()     - Run complete test suite
• quickButtonTest()   - Test all buttons quickly
• quickTableTest()    - Test table responsiveness
• quickChartTest()    - Test chart dimensions

To start, run: runFullQATest()
`);