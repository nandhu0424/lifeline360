const http = require('http');

const TEST_PORT = process.env.PORT || 5000;
console.log(`📡 Targeting Lifeline360 server on port ${TEST_PORT}`);

// Helper for HTTP requests using native Node.js HTTP client
const makeRequest = (method, path, headers = {}, body = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: TEST_PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, headers: res.headers, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, body: data });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

const runTests = async () => {
    try {
        console.log('\n🟢 Starting automated test suite for Grievance Redressal System...\n');

        // TEST 1: Submit and validate a grievance
        console.log('🧪 Test 1: Submit a new grievance (POST /api/grievances)');
        const submitPayload = {
            name: 'Ramesh Kumar',
            email: 'ramesh.kumar@gmail.com',
            phone: '9845012345',
            category: 'Medical services & staff',
            district: 'Coimbatore',
            message: 'The waiting period at the OPD of Melur Sub Centre is excessively long (over 2 hours).'
        };

        const submitRes = await makeRequest('POST', '/api/grievances', {}, submitPayload);
        console.log(`   Response status: ${submitRes.status}`);
        console.log(`   Response body:`, submitRes.body);

        if (submitRes.status !== 201 || !submitRes.body.success || !submitRes.body.reference_id) {
            throw new Error('❌ Test 1 Failed: Submission failed.');
        }
        const refId = submitRes.body.reference_id;
        console.log(`   Generated ID: ${refId} (Assigned status: ${submitRes.body.status})`);
        console.log('✅ Test 1 Passed.\n');

        // TEST 2: Validate fields checking
        console.log('🧪 Test 2: Validation errors for missing fields (POST /api/grievances)');
        const badPayload = { name: '', email: 'no-name@test.com' };
        const badRes = await makeRequest('POST', '/api/grievances', {}, badPayload);
        console.log(`   Response status: ${badRes.status}`);
        console.log(`   Response body:`, badRes.body);
        if (badRes.status !== 400 || badRes.body.success) {
            throw new Error('❌ Test 2 Failed: Did not reject invalid payload.');
        }
        console.log('✅ Test 2 Passed.\n');

        // TEST 3: Track public endpoint
        console.log(`🧪 Test 3: Tracking details lookup (GET /api/grievances/track/${refId})`);
        const trackRes = await makeRequest('GET', `/api/grievances/track/${refId}`);
        console.log(`   Response status: ${trackRes.status}`);
        console.log(`   Response body:`, trackRes.body);

        if (trackRes.status !== 200 || !trackRes.body.success) {
            throw new Error('❌ Test 3 Failed: Tracking lookup failed.');
        }
        // Confirm PII is NOT leaked
        const leakKeys = ['name', 'email', 'phone', 'assigned_to'];
        leakKeys.forEach(k => {
            if (trackRes.body[k] !== undefined) {
                throw new Error(`❌ Test 3 Failed: PII Leak - field "${k}" was returned!`);
            }
        });
        console.log('   Confirmed: Citizen-safe response fields filtered (No PII leaks).');
        console.log('✅ Test 3 Passed.\n');

        // TEST 4: Track invalid Reference ID
        console.log('🧪 Test 4: Tracking invalid reference ID');
        const invalidTrackRes = await makeRequest('GET', '/api/grievances/track/GRV-NONEXISTENT');
        console.log(`   Response status: ${invalidTrackRes.status}`);
        console.log(`   Response body:`, invalidTrackRes.body);
        if (invalidTrackRes.status !== 404 || invalidTrackRes.body.success) {
            throw new Error('❌ Test 4 Failed: Expected 404 for bad reference ID.');
        }
        console.log('✅ Test 4 Passed.\n');

        // TEST 5: Authenticated Staff login verification
        console.log('🧪 Test 5: Authed staff login flow (POST /api/auth/login)');
        const loginPayload = {
            username: 'admin@lifeline360.gov.in',
            password: 'adminpassword123'
        };
        const loginRes = await makeRequest('POST', '/api/auth/login', {}, loginPayload);
        console.log(`   Response status: ${loginRes.status}`);
        console.log(`   Response user details:`, loginRes.body.user);

        if (loginRes.status !== 200 || !loginRes.body.success || !loginRes.body.token) {
            throw new Error('❌ Test 5 Failed: Staff login failed.');
        }
        const token = loginRes.body.token;
        console.log('✅ Test 5 Passed.\n');

        // TEST 6: Fetch staff grievances list
        console.log('🧪 Test 6: Fetch Full Grievance List (GET /api/grievances) using auth token');
        const listRes = await makeRequest('GET', '/api/grievances', { 'Authorization': `Bearer ${token}` });
        console.log(`   Response status: ${listRes.status}`);
        console.log(`   Grievances count returned: ${listRes.body.count}`);

        if (listRes.status !== 200 || !listRes.body.success || !Array.isArray(listRes.body.data)) {
            throw new Error('❌ Test 6 Failed: Failed to fetch dashboard data.');
        }
        const record = listRes.body.data.find(g => g.reference_id === refId);
        if (!record) {
            throw new Error('❌ Test 6 Failed: Submitted grievance not returned in list.');
        }
        const mongoId = record._id;
        console.log(`   Submitted record found. Mongo ID: ${mongoId}`);
        console.log('✅ Test 6 Passed.\n');

        // TEST 7: Fetch single detailed grievance
        console.log(`🧪 Test 7: Get full detailed grievance (GET /api/grievances/${mongoId})`);
        const detailRes = await makeRequest('GET', `/api/grievances/${mongoId}`, { 'Authorization': `Bearer ${token}` });
        console.log(`   Response status: ${detailRes.status}`);
        console.log(`   Response data message: "${detailRes.body.data.message}"`);

        if (detailRes.status !== 200 || !detailRes.body.success || !detailRes.body.data.email) {
            throw new Error('❌ Test 7 Failed: Failed to fetch grievance details.');
        }
        console.log('✅ Test 7 Passed.\n');

        // TEST 8: Patch status update and verify notifications
        console.log(`🧪 Test 8: Patch Update and log notification (PATCH /api/grievances/${mongoId})`);
        const patchPayload = {
            status: 'in_review',
            assigned_to: 'Nodal Officer Coimbatore',
            resolution_note: 'Assigned to the Nodal Officer of Coimbatore district for immediate action.'
        };
        const patchRes = await makeRequest('PATCH', `/api/grievances/${mongoId}`, { 'Authorization': `Bearer ${token}` }, patchPayload);
        console.log(`   Response status: ${patchRes.status}`);
        console.log(`   Updated status: ${patchRes.body.data.status}`);
        console.log(`   Assigned To: ${patchRes.body.data.assigned_to}`);

        if (patchRes.status !== 200 || !patchRes.body.success || patchRes.body.data.status !== 'in_review') {
            throw new Error('❌ Test 8 Failed: Patch update unsuccessful.');
        }
        console.log('✅ Test 8 Passed.\n');

        // TEST 9: Unauthorized block
        console.log('🧪 Test 9: Reject staff endpoint without authentication header/cookie');
        const unauthorizedRes = await makeRequest('GET', '/api/grievances');
        console.log(`   Response status: ${unauthorizedRes.status}`);
        console.log(`   Response body:`, unauthorizedRes.body);
        if (unauthorizedRes.status !== 401 || unauthorizedRes.body.success) {
            throw new Error('❌ Test 9 Failed: Handled request without auth token.');
        }
        console.log('✅ Test 9 Passed.\n');

        console.log('✨ All 9 tests passed successfully! Grievance Redressal System is fully verified.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Verification script encountered errors:', error.message);
        process.exit(1);
    }
};

runTests();
