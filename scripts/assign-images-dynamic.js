const fetch = require('node-fetch');

async function run() {
    const baseUrl = 'http://localhost:3001/api/room-types';

    // 1. Fetch All
    const res = await fetch(baseUrl);
    const types = await res.json();
    console.log(`Fetched ${types.length} types`);

    // 2. Map of Name -> Image
    const map = {
        'Standard Room': 'standard-room.png',
        // Note: We have 3 'Deluxe Room' entries, distinct by hotel.
        // We need to check Hotel Name if possible, or just assign based on index/random for variety?
        // Let's assign based on rough matching.
    };

    for (const t of types) {
        let img = null;
        if (t.name === 'Standard Room') img = 'standard-room.png';
        else if (t.name === 'Deluxe Room') {
            // Differentiate by hotel city/name if available in 'hotel' relation
            if (t.hotel?.city === 'Phuket' || t.hotel?.city === 'Pattaya') img = 'ocean-suite.png';
            else img = 'family-studio.png'; // Khao Yai or others
        }
        else if (t.name === 'Verified Luxury Suite') {
            // Already has one, but let's skip or overwrite?
            // Skip for now.
            continue;
        }

        if (img) {
            console.log(`Updating ${t.name} (${t.id}) with ${img}`);
            const updateRes = await fetch(`${baseUrl}/${t.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images: [`/uploads/${img}`] })
            });
            if (!updateRes.ok) console.error(`Failed: ${await updateRes.text()}`);
            else console.log('OK');
        }
    }
}
run();
