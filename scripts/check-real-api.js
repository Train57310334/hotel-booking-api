const http = require('http');

const hotelId = 'cmkmqbn16000113bj400bdzme';
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const path = `/api/hotels/${hotelId}?checkIn=${today}&checkOut=${tomorrow}&guests=1`;

console.log('Fetching:', path);

http.get({
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: 'GET'
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const hotel = JSON.parse(data);
            console.log('Hotel:', hotel.name);
            if (hotel.roomTypes) {
                hotel.roomTypes.forEach(rt => {
                    console.log(`\n[Room] ${rt.name}`);
                    console.log('  isAvailable:', rt.isAvailable);
                    console.log('  BasePrice (root):', rt.basePrice);
                    console.log('  RatePlans:', rt.ratePlans ? rt.ratePlans.length : 'None');
                    if (rt.ratePlans) {
                        rt.ratePlans.forEach(rp => console.log(`    - Plan: ${rp.name}, Price: ${rp.pricePerNight}, Total: ${rp.totalPrice}`));
                    }
                });
            } else {
                console.log('No roomTypes returned');
            }
        } catch (e) {
            console.error('Parse Error', e);
            console.log('Raw:', data);
        }
    });
}).on('error', (err) => console.error('Error:', err.message));
