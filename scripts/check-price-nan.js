async function check() {
    try {
        // Use native fetch (Node 18+)
        const url = 'http://localhost:3001/api/hotels?checkIn=2026-01-29&checkOut=2026-01-29&guests=1';
        console.log('Fetching:', url);
        const res = await fetch(url);
        const data = await res.json();

        if (data.length > 0) {
            const hotel = data[0];
            const room = hotel.roomTypes[0];
            const plan = room.ratePlans[0];
            console.log('Price Per Night:', plan.pricePerNight);
            console.log('Total Price:', plan.totalPrice);

            // Check finding 
            console.log('Full structure of first plan (partial):', {
                name: plan.name,
                pricePerNight: plan.pricePerNight,
                totalPrice: plan.totalPrice
            });
        } else {
            console.log('No hotels found');
        }
    } catch (e) {
        console.error(e);
    }
}

check();
