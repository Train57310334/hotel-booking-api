const fs = require('fs');

const path = 'c:/Users/ASUS/workspace/hotel-booking/hotel-booking-nest-postgres/src/modules/bookings/bookings.service.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix 'phone' to 'contactPhone'
content = content.replace(/select: \{ name: true, address: true, images: true, phone: true \}/g, 'select: { name: true, address: true, images: true, contactPhone: true }');

// We have duplicated functions at the bottom. The easiest way to resolve is to slice off the entire bottom part added by the previous script
// Let's find the first instance of '  async findForGuest(' and keep it.

const firstIndex = content.indexOf('  async findForGuest(');
const lastIndex = content.lastIndexOf('  async findForGuest(');

if (firstIndex !== -1 && lastIndex !== -1 && firstIndex !== lastIndex) {
    // The previous recovery script appended from findForGuest onwards to the end of the file.
    // So we can assume everything from the LAST 'findForGuest' to the end of the file is a duplicated block.
    // Wait, let's locate the marker.
    const marker = '  // --- RECOVERED FUNCTIONS ---';
    const markerIndex = content.indexOf(marker);
    if (markerIndex !== -1) {
        console.log('Found recovery block, excising it...');
        content = content.substring(0, markerIndex).trimEnd() + '\n}\n';
    }
} else {
    console.log("No duplicate block found via standard markers.");
}

fs.writeFileSync(path, content, 'utf8');
console.log('Patched BookingsService duplicates and property mappings.');
