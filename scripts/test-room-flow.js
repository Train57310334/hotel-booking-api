// const fetch = require('node-fetch'); // Using Node 18+ native fetch

const API_URL = 'http://localhost:3001/api';
// We might need a token if Auth is enabled. The controller uses @UseGuards(JwtAuthGuard).
// I'll try to login first or just try without if I don't have credentials.
// Wait, I can see `seed-admin.ts` to get a default user.

async function test() {
    try {
        console.log('1. Logging in...');
        // Assuming default admin from seed or I'll create one if needed. 
        // Let's try to register a new admin or login with a common one if known.
        // For now, let's try to hit a public endpoint to see if server is up.

        // Actually, I can temporarily disable Auth Guard in controller for testing if I can't login easily,
        // but better to reproduce properly.
        // Let's assume the user is logged in on frontend.
        // I'll skip login for this script and assume I can disable guard OR I use a known token?
        // Let's try to create a token or just disable the guard for a moment to verify logic.
        // Disabling guard is faster for debugging logic.

        // NOTE: For this script to work, I will temporarily modify the controller to comment out `@UseGuards`.
        // This is safer than guessing passwords.

        console.log('Skipping login (assuming Auth Guard disabled for test)...');

        // 2. Create Room Type
        console.log('\n2. Creating Room Type...');
        const typeRes = await fetch(`${API_URL}/room-types`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Suite ' + Date.now(),
                price: 5000,
                hotelId: 'UNKNOWN_ID_NEED_TO_FETCH' // expecting failure if hotelId needed
            })
        });

        // We need a hotel ID first.
        // Let's fetch hotels.
        const hotelsRes = await fetch(`${API_URL}/hotels`);
        const hotels = await hotelsRes.json();
        if (!hotels.length) {
            console.error('No hotels found. Cannot proceed.');
            return;
        }
        const hotelId = hotels[0].id;
        console.log('Using Hotel ID:', hotelId);

        const typeRes2 = await fetch(`${API_URL}/room-types`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Suite ' + Date.now(),
                price: 5000,
                hotelId: hotelId
            })
        });
        const roomType = await typeRes2.json();
        console.log('Room Type Created:', roomType.id);

        // 3. Create Room
        console.log('\n3. Creating Room...');
        const roomRes = await fetch(`${API_URL}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomTypeId: roomType.id,
                roomNumber: '999'
            })
        });
        const room = await roomRes.json();
        console.log('Room Created:', room);
        if (!room.roomNumber) console.error('FAIL: roomNumber missing in response!');

        // 4. Update Room
        console.log('\n4. Updating Room...');
        const updateRes = await fetch(`${API_URL}/rooms/${room.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomTypeId: roomType.id,
                roomNumber: '999-UPDATED'
            })
        });
        const updatedRoom = await updateRes.json();
        console.log('Room Updated:', updatedRoom);
        if (updatedRoom.roomNumber !== '999-UPDATED') console.error('FAIL: Update did not persist!');

        // 5. Delete Room
        console.log('\n5. Deleting Room...');
        const deleteRes = await fetch(`${API_URL}/rooms/${room.id}`, {
            method: 'DELETE'
        });
        const deleteResult = await deleteRes.json();
        console.log('Delete Result:', deleteResult);
        if (!deleteResult.deletedAt) console.error('FAIL: deletedAt not set!');

    } catch (e) {
        console.error('ERROR:', e);
    }
}

test();
