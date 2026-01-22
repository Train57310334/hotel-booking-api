const fetch = require('node-fetch'); // or native fetch in newer node

// Native fetch wrapper if node-fetch isn't available
const apiCall = async (id, image) => {
    const url = `http://localhost:3001/api/room-types/${id}`;
    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                images: [`/uploads/${image}`]
            })
        });
        if (res.ok) console.log(`Updated ${id} with ${image}`);
        else console.error(`Failed ${id}: ${await res.text()}`);
    } catch (e) { console.error(`Error ${id}:`, e); }
};

const updates = [
    { id: 'cmkmtrk5e003p4kfft5x935j8', img: 'standard-room.png' }, // Chiang Mai
    { id: 'cmkmtrk6n00714kffujzodj38', img: 'ocean-suite.png' },   // Phuket
    { id: 'cmkmtrk7t00ai4kffudpirdim', img: 'ocean-suite.png' },   // Pattaya
    { id: 'cmkmtrk9000dz4kfffx0e784o', img: 'family-studio.png' }  // Khao Yai
];

(async () => {
    for (const u of updates) {
        await apiCall(u.id, u.img);
    }
})();
