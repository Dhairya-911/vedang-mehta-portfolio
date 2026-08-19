// Contact Form Debug Helper
// Add this to the browser console to test the contact form

console.log('🔧 Contact Form Debug Helper Loaded');

// Check if form elements exist
function checkFormElements() {
    const elements = {
        form: document.getElementById('contactForm'),
        submitBtn: document.getElementById('submitBtn'),
        submitText: document.getElementById('submitText'),
        submitLoader: document.getElementById('submitLoader'),
        formStatus: document.getElementById('formStatus'),
        name: document.getElementById('name'),
        email: document.getElementById('email'),
        service: document.getElementById('service'),
        message: document.getElementById('message')
    };
    
    console.log('📋 Form Elements Check:');
    Object.keys(elements).forEach(key => {
        const element = elements[key];
        console.log(`${key}: ${element ? '✅ Found' : '❌ Missing'}`);
    });
    
    return elements;
}

// Test API connection
async function testAPIConnection() {
    const apiUrls = [
        'http://localhost:3000/api/contact',
        'https://vedang-portfolio-kgdn.onrender.com/api/contact'
    ];
    
    console.log('🌐 Testing API Connections:');
    
    for (const url of apiUrls) {
        try {
            console.log(`Testing: ${url}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                console.log(`✅ ${url} - Status: ${response.status}`);
            } else {
                console.log(`❌ ${url} - Status: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ ${url} - Error: ${error.message}`);
        }
    }
}

// Test form submission with dummy data
async function testFormSubmission() {
    const testData = {
        name: 'Test User',
        email: 'test@example.com',
        service: 'weddings',
        message: 'This is a test message for debugging purposes.'
    };
    
    const hostname = window.location.hostname;
    const apiUrl = hostname === 'localhost' || hostname === '127.0.0.1' 
        ? 'http://localhost:3000/api/contact'
        : 'https://vedang-portfolio-kgdn.onrender.com/api/contact';
    
    console.log('🧪 Testing Form Submission:');
    console.log('API URL:', apiUrl);
    console.log('Test Data:', testData);
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        
        console.log('Response Status:', response.status);
        console.log('Response Data:', result);
        
        if (result.success) {
            console.log('✅ Form submission test PASSED');
        } else {
            console.log('❌ Form submission test FAILED');
        }
        
        return result;
    } catch (error) {
        console.error('❌ Form submission test ERROR:', error);
        return { success: false, error: error.message };
    }
}

// Run all checks
async function runAllChecks() {
    console.log('🚀 Running Contact Form Diagnostics...');
    console.log('=====================================');
    
    // Check form elements
    checkFormElements();
    console.log('');
    
    // Test API connection
    await testAPIConnection();
    console.log('');
    
    // Test form submission
    await testFormSubmission();
    console.log('');
    
    console.log('✅ Diagnostics Complete!');
}

// Auto-run diagnostics
runAllChecks();

// Make functions available globally for manual testing
window.contactFormDebug = {
    checkFormElements,
    testAPIConnection,
    testFormSubmission,
    runAllChecks
};
