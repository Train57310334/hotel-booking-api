// Native fetch is available in Node 18+

const API_BASE = 'http://localhost:3001/api'; // Adjust if needed

async function runSimulation() {
    console.log('🚀 Starting High Season Simulation...');

    // 1. Register & Login
    const email = `sim_${Date.now()}@test.com`;
    const password = 'password123';

    console.log(`\n1. Registering user: ${email}`);
    let res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Sim Owner', role: 'hotel_admin' })
    });

    if (!res.ok) {
        // If register fails, try login (user might exist from previous run)
        console.log('   Registration failed (maybe exists), trying login...');
    }

    res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!res.ok) throw new Error('Login failed: ' + await res.text());
    const loginData = await res.json();
    console.log('   Login Response:', loginData);
    const { token: access_token } = loginData;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
    };
    console.log('   Login successful! Token acquired.');

    // 2. Create Hotel
    console.log('\n2. Creating Hotel...');
    res = await fetch(`${API_BASE}/hotels`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'High Season Resort', description: 'Simulation Hotel' })
    });

    if (!res.ok) throw new Error('Create Hotel failed: ' + await res.text());
    const hotel = await res.json();
    console.log(`   Hotel created: ${hotel.name} (ID: ${hotel.id})`);

    // 3. Create Room Type
    console.log('\n3. Creating Room Type...');
    res = await fetch(`${API_BASE}/room-types`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            hotelId: hotel.id,
            name: 'Deluxe Sim View',
            basePrice: 2000,
            maxAdults: 2
        })
    });

    if (!res.ok) throw new Error('Create Room Type failed: ' + await res.text());
    const roomType = await res.json();
    console.log(`   Room Type created: ${roomType.name} (ID: ${roomType.id})`);

    // 4. Bulk Create Rooms
    console.log('\n4. Testing Bulk Room Creation...');
    res = await fetch(`${API_BASE}/rooms/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            roomTypeId: roomType.id,
            prefix: 'SIM',
            startNumber: 101, // 101, 102...
            count: 20
        })
    });

    if (!res.ok) throw new Error('Bulk Create Rooms failed: ' + await res.text());
    const bulkRooms = await res.json();
    // Assuming API returns { count: 20 } or similar, standard Prisma createMany return.
    console.log(`   Bulk Rooms Result:`, bulkRooms);

    // 5. Bulk Update Rates & Inventory
    console.log('\n5. Testing Bulk Rates & Inventory Update...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 10); // 10 days from now
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 5); // 5 day window

    const sDateStr = startDate.toISOString().split('T')[0];
    const eDateStr = endDate.toISOString().split('T')[0];

    console.log(`   Target Dates: ${sDateStr} to ${eDateStr}`);

    // Inventory
    res = await fetch(`${API_BASE}/inventory/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            roomTypeId: roomType.id,
            startDate: sDateStr,
            endDate: eDateStr,
            allotment: 15, // Only selling 15 of 20
            stopSale: false
        })
    });

    if (!res.ok) throw new Error('Bulk Inventory failed: ' + await res.text());
    console.log(`   Inventory Bulk Update Response status: ${res.status}`);

    // Create Rate Plan first (needed for overrides) - logic simplified in prev implementation but lets follow clean path
    res = await fetch(`${API_BASE}/rates/plans`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            hotelId: hotel.id,
            name: 'Standard Plan',
            cancellationRule: 'Flex',
            roomTypeId: roomType.id
        })
    });

    if (!res.ok) throw new Error('Create Rate Plan failed: ' + await res.text());
    const ratePlan = await res.json();
    console.log(`   Rate Plan created: ${ratePlan.id}`);


    // Rates Override
    res = await fetch(`${API_BASE}/rates/overrides/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            roomTypeId: roomType.id,
            ratePlanId: ratePlan.id,
            startDate: sDateStr,
            endDate: eDateStr,
            baseRate: 9999 // High Season Price!
        })
    });

    if (!res.ok) throw new Error('Bulk Rates failed: ' + await res.text());
    console.log(`   Rates Bulk Update Response status: ${res.status}`);

    // 6. Verify Bookings
    console.log('\n6. Simulating Guest Booking check...');
    // We check availability first (Search rooms in the hotel)
    const checkUrl = `${API_BASE}/hotels/${hotel.id}?checkIn=${sDateStr}&checkOut=${eDateStr}&guests=2`;
    res = await fetch(checkUrl);

    if (!res.ok) {
        console.log('Search API failed: ' + await res.text());
    } else {
        const hotelData = await res.json();
        // search returns the hotel with roomTypes array
        const foundType = hotelData.roomTypes && hotelData.roomTypes.find(r => r.id === roomType.id);

        if (foundType) {
            console.log(`   Search Success! Found ${foundType.name}`);
            // Check if availableRoomCount > 0
            console.log(`   Availability Check: ${foundType.availableRoomCount} rooms available.`);
            console.log(`   Price Check: Found:`, foundType.totalPrice || 'N/A');
        } else {
            console.log('   Search Failed: Room Type not found in hotel data.');
            // console.log('   Results:', JSON.stringify(hotelData, null, 2));
        }
    }

    console.log('\n✅ Simulation Complete.');
}

runSimulation().catch(console.error);
