
async function testLogin() {
    const url = 'http://localhost:3001/api/auth/login';
    const body = {
        email: 'newowner@hotel.com',
        password: '123'
    };

    console.log(`Testing Login API: ${url}`);
    console.log(`Payload:`, body);

    try {
        // Node 18+ has native fetch
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log(`Response:`, JSON.stringify(data, null, 2));

        if (res.status === 201 || res.status === 200) {
            console.log('✅ API Login SUCCESS!');
        } else {
            console.log('❌ API Login FAILED!');
        }

    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testLogin();
