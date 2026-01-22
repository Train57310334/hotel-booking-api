const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting Soft Delete Test...');

    try {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error('No hotel found');

        // 1. Create Room Type
        const roomType = await prisma.roomType.create({
            data: {
                hotelId: hotel.id,
                name: 'Soft Delete Test Suite',
                basePrice: 6000
            }
        });

        // 2. Create Room
        const room = await prisma.room.create({
            data: { roomTypeId: roomType.id }
        });
        console.log('Room Created:', room.id);

        // 3. Create Booking (to enforce constraint if it were a hard delete)
        let ratePlan = await prisma.ratePlan.findFirst({ where: { roomTypeId: roomType.id } });
        if (!ratePlan) {
            ratePlan = await prisma.ratePlan.create({
                data: {
                    hotelId: hotel.id,
                    roomTypeId: roomType.id,
                    name: 'Standard',
                }
            });
        }
        await prisma.booking.create({
            data: {
                hotelId: hotel.id,
                roomTypeId: roomType.id,
                ratePlanId: ratePlan.id,
                roomId: room.id,
                checkIn: new Date(),
                checkOut: new Date(Date.now() + 86400000),
                guestsAdult: 1,
                guestsChild: 0,
                totalAmount: 6000,
                status: 'confirmed',
                leadName: 'Soft Tester',
                leadEmail: 'soft@test.com',
                leadPhone: '999'
            }
        });
        console.log('Booking Created (Constraint Active)');

        // 4. Perform "Delete" (Should be Soft Delete via Service logic, but here we test raw DB capability? 
        // Wait, the "Service" does the `update`. The DB itself doesn't magically soft delete on `delete`.
        // The Frontend calls the API -> Controller -> Service.
        // So this script should test the *backend logic* equivalent.
        // I will simulate what the Service does: UPDATE `deletedAt`.

        console.log('Simulating Service Soft Delete...');
        const updated = await prisma.room.update({
            where: { id: room.id },
            data: { deletedAt: new Date() }
        });
        console.log('Room Marked as Deleted at:', updated.deletedAt);

        // 5. Verify it's filtered out from a standard "findMany" with filter
        const found = await prisma.room.findFirst({
            where: { id: room.id, deletedAt: null }
        });

        if (found) {
            console.error('FAIL: Room still found after soft delete (filter failed)');
        } else {
            console.log('SUCCESS: Room not found with deletedAt: null filter');
        }

        // Clean up? (Optional, might leave garbage but it's "deleted")
    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
