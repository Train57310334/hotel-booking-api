const fs = require('fs');
const path = require('path');

async function test() {
    const url = 'http://localhost:3001/api/room-types';
    const data = JSON.parse(fs.readFileSync('temp_room_type.json', 'utf8'));

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            console.log('Status:', res.status);
            console.log('Response:', await res.text());
        } else {
            const json = await res.json();
            console.log('Success:', JSON.stringify(json));

            // Step 2: Create Physical Room
            if (json.id) {
                const roomUrl = 'http://localhost:3001/api/rooms';
                const roomRes = await fetch(roomUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomTypeId: json.id })
                });
                console.log('Room Creation:', await roomRes.text());
            }
        }
    } catch (err) {
        console.error('Network Error:', err);
    }
}

test();
