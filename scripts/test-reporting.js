const _fetch = fetch; // Use native fetch

const API_BASE = 'http://localhost:3001/api';
const EMAIL = `report_test_${Date.now()}@test.com`;
const PASSWORD = 'password123';

async function runTest() {
    console.log('🚀 Starting Reporting & Expense Test...\n');

    try {
        // 1. Register & Login
        let res = await _fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: 'Report Tester' })
        });

        // Login
        res = await _fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });
        if (!res.ok) {
            console.error('❌ Login Failed:', await res.text());
            return;
        }
        const loginData = await res.json();
        const token = loginData.token || loginData.access_token;
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        console.log('✅ Login Successful');

        // 2. Create Hotel
        res = await _fetch(`${API_BASE}/hotels`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: 'Financial Hotel' })
        });

        if (!res.ok) {
            console.error('❌ Create Hotel Failed:', await res.text());
            return;
        }

        const hotel = await res.json();
        console.log(`✅ Hotel Created: ${hotel.name} (${hotel.id})`);

        // 2.1 Re-Login to refresher Token with new Hotel ID
        // (Important: Since we just created the hotel, the previous token defaults to null/old hotelId)
        const loginRes2 = await _fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });
        const loginData2 = await loginRes2.json();
        const token2 = loginData2.token || loginData2.access_token;

        // Update Headers with NEW Token
        headers['Authorization'] = `Bearer ${token2}`;
        console.log('✅ Token Refreshed (Loaded Hotel Context)');

        // 3. Create Room Type & Booking (REVENUE)
        console.log('\n--- Generating Revenue ---');
        res = await _fetch(`${API_BASE}/room-types`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ hotelId: hotel.id, name: 'Standard Room', basePrice: 2000 })
        });
        const roomType = await res.json();

        // 3.1 Setup Inventory (Fix "No rooms available")
        const invRes = await _fetch(`${API_BASE}/inventory/bulk`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                roomTypeId: roomType.id,
                startDate: '2026-05-01',
                endDate: '2026-05-05',
                allotment: 10
            })
        });
        if (invRes.ok) console.log('✅ Inventory Setup: Added 10 rooms');

        // 3.2 Create Physical Room (Fix "No specific room available")
        // Booking logic assigns a specific physical room to avoid double booking.
        const roomRes = await _fetch(`${API_BASE}/rooms`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                hotelId: hotel.id,
                roomTypeId: roomType.id,
                name: '101',
                status: 'available'
            })
        });
        if (roomRes.ok) console.log('✅ Physical Room Created: 101');
        else console.log('❌ Room Creation Failed:', await roomRes.text());

        // Create Booking 1: 5000 THB
        res = await _fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                hotelId: hotel.id,
                roomTypeId: roomType.id,
                ratePlanId: 'dummy_plan_id', // Assuming valid or bypassed if optional? Usually required.
                // Wait, creating booking via API usually requires ratePlan.
                // Let's assume we can skip or need to create one.
                // For simplicity, let's create a dummy rate plan if needed or use existing logic.
                // Actually, let's just use the /bookings endpoint which might auto-calculate?
                // The previous simulation script created RatePlan. Let's do that quickly.
                checkIn: '2026-05-01',
                checkOut: '2026-05-02',
                endDate: '2026-05-02',
                leadGuest: { name: 'Rich Guest', email: 'rich@test.com', phone: '123' },
                totalAmount: 5000,
                status: 'confirmed'
            })
        });

        // If booking creation fails due to missing ID, we might need more setup.
        // Let's try to bypass complexity by assuming we can just insert mock booking if testing reports?
        // No, let's do it properly-ish.
        // Actually, let's cheat and use "Expense" with negative category? No.
        // Let's try to create a Booking. If it fails, we focus on Expenses.

        // Alternative: Use /bookings endpoint.
        // If RatePlan is required, we need to create one.
        // Let's create Rate Plan.
        const rpRes = await _fetch(`${API_BASE}/rates/plans`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ hotelId: hotel.id, roomTypeId: roomType.id, name: 'Standard Rate' })
        });
        if (!rpRes.ok) {
            console.error('❌ Create RatePlan Failed:', await rpRes.text());
            // Fallback: try to find existing? Or abort.
        }
        const ratePlan = await rpRes.json();
        console.log('ℹ️ RatePlan ID:', ratePlan.id);

        const bookingRes = await _fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                hotelId: hotel.id,
                roomTypeId: roomType.id,
                ratePlanId: ratePlan.id,
                checkIn: '2026-05-01',
                checkOut: '2026-05-02',
                guests: { adult: 1, child: 0 },
                leadGuest: { name: 'Rich Guest', email: 'rich@test.com', phone: '123' },
                totalAmount: 2000 // Match expected base price to avoid validation error
            })
        });

        if (bookingRes.ok) {
            const booking = await bookingRes.json();
            console.log('✅ Booking Created (Revenue Source):', booking.id, 'Amount:', booking.totalAmount);
            // Note: Booking usually has pending status or similar. 
            // We might need to Confirm it to show up in revenue (status != cancelled/pending)?
            // Report logic: status NOT IN ('cancelled', 'pending').
            // New bookings are usually 'pending'. We need to update status.
            await _fetch(`${API_BASE}/bookings/admin/${booking.id}/status?hotelId=${hotel.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: 'confirmed' })
            });
            console.log('✅ Booking Confirmed');
        } else {
            console.log('⚠️ Expense Test Only (Booking Failed):', await bookingRes.text());
        }


        // 4. Create Expenses
        console.log('\n--- Generating Expenses ---');
        const expense1 = { hotelId: hotel.id, title: 'Electricity Bill', amount: 1500, date: '2026-05-01', category: 'utilities' };
        const expense2 = { hotelId: hotel.id, title: 'Staff Salary', amount: 30000, date: '2026-05-01', category: 'salary' };

        const e1 = await _fetch(`${API_BASE}/expenses`, { method: 'POST', headers, body: JSON.stringify(expense1) });
        if (!e1.ok) console.log('❌ Expense 1 Failed:', await e1.text());

        const e2 = await _fetch(`${API_BASE}/expenses`, { method: 'POST', headers, body: JSON.stringify(expense2) });
        if (!e2.ok) console.log('❌ Expense 2 Failed:', await e2.text());

        console.log(`✅ Created Expenses (if passing): ${expense1.amount + expense2.amount} THB`);

        // 5. Verify Report
        console.log('\n--- Verifying Report Summary ---');
        // Range: 2026-01-01 to 2026-12-31
        const summaryRes = await _fetch(`${API_BASE}/reports/summary?from=2026-01-01&to=2026-12-31`, { headers });
        const summary = await summaryRes.json();

        console.log('Report Summary:', summary);

        if (summary.totalExpenses === 31500) {
            console.log('✅ Expense Calculation Correct');
        } else {
            console.error('❌ Expense Calculation WRONG. Expected 31500');
        }

        // Check Profit
        const expRevenue = (bookingRes.ok) ? summary.totalRevenue : 0; // Assuming dynamic pricing might vary default booking price?
        // Actually booking price depends on rate plan logic.
        // Let's just check Math: Profit = Revenue - Expense
        const expectedProfit = summary.totalRevenue - summary.totalExpenses;

        if (summary.totalProfit === expectedProfit) {
            console.log('✅ Profit Logic Correct (Revenue - Expense)');
        } else {
            console.error(`❌ Profit Logic WRONG. Got ${summary.totalProfit}, Expected ${expectedProfit}`);
        }

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

runTest();
