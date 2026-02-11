const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const bcrypt = require('bcryptjs')

async function main() {
    const targetEmail = 'admin@bookingkub.com'
    const targetPassword = 'password123'

    console.log('🚧 STARTING DATABASE RESET & SEED 🚧')

    // 1. Find or Create Admin User
    let adminUser = await prisma.user.findUnique({ where: { email: targetEmail } })
    if (!adminUser) {
        console.log('Creating Admin User...')
        const passwordHash = await bcrypt.hash(targetPassword, 10)
        adminUser = await prisma.user.create({
            data: {
                email: targetEmail,
                passwordHash,
                name: 'Super Admin',
                roles: ['user', 'hotel_admin', 'platform_admin']
            }
        })
    } else {
        console.log('Found Admin User:', adminUser.id)
    }

    // 2. Clear All Hotel Data (Bottom-Up)
    console.log('Clearing old data...')

    await prisma.roleAssignment.deleteMany({}) // Clear roles first to avoid FK issues
    await prisma.message.deleteMany({})
    await prisma.review.deleteMany({})
    await prisma.expense.deleteMany({})
    await prisma.promotion.deleteMany({})

    // Booking Related
    await prisma.payment.deleteMany({})
    await prisma.folioCharge.deleteMany({})
    await prisma.guest.deleteMany({})
    await prisma.booking.deleteMany({})

    // Rates
    await prisma.rateOverride.deleteMany({})
    await prisma.ratePlan.deleteMany({})

    // Rooms
    await prisma.roomStatusLog.deleteMany({})
    await prisma.room.deleteMany({})
    await prisma.inventoryCalendar.deleteMany({})
    await prisma.roomType.deleteMany({})

    // Hotel
    await prisma.hotel.deleteMany({})

    console.log('✅ Old data cleared.')

    // 3. Create New Hotel
    console.log('Creating new Hotel...')
    const hotel = await prisma.hotel.create({
        data: {
            name: 'The Siam Riverside',
            description: 'Experience luxury living by the majestic Chao Phraya River. Our hotel offers world-class amenities, breathtaking views, and exceptional service for a memorable stay in Bangkok.',
            address: '123 Charoen Nakhon Rd, Khlong Ton Sai',
            city: 'Bangkok',
            country: 'Thailand',
            imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000', // Luxury Hotel
            package: 'PRO', // Enable features
            ownerId: adminUser.id,
            amenities: ['Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Free Wi-Fi', 'Parking', 'Concierge']
        }
    })

    // 4. Assign Role
    await prisma.roleAssignment.create({
        data: {
            userId: adminUser.id,
            hotelId: hotel.id,
            role: 'hotel_admin'
        }
    })

    // 5. Create Room Types
    console.log('Seeding Room Types...')
    const roomTypesData = [
        {
            name: 'Deluxe River View',
            basePrice: 3500,
            sizeSqm: 45,
            bedConfig: 'King Bed',
            maxAdults: 2,
            maxChildren: 1,
            description: 'Spacious room with a stunning view of the river. Features a private balcony and modern amenities.',
            images: [
                'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=800',
                'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800'
            ],
            amenities: ['Wi-Fi', 'Air Conditioning', 'TV', 'Minibar', 'Balcony', 'Safe']
        },
        {
            name: 'Family Suite',
            basePrice: 5500,
            sizeSqm: 75,
            bedConfig: '2 Queen Beds',
            maxAdults: 4,
            maxChildren: 2,
            description: 'Perfect for families, this suite offers extra space, a separate living area, and comfortable bedding for everyone.',
            images: [
                'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
                'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800'
            ],
            amenities: ['Wi-Fi', 'Air Conditioning', 'TV', 'Minibar', 'Bathtub', 'Desk', 'Living Area']
        },
        {
            name: 'Executive Studio',
            basePrice: 2800,
            sizeSqm: 35,
            bedConfig: 'Queen Bed',
            maxAdults: 2,
            maxChildren: 0,
            description: 'Designed for business travelers, featuring a dedicated workspace and high-speed internet.',
            images: [
                'https://images.unsplash.com/photo-1631049307204-86db42d70990?auto=format&fit=crop&q=80&w=800'
            ],
            amenities: ['Wi-Fi', 'Air Conditioning', 'Desk', 'Coffee Machine', 'Ironing Facilities']
        }
    ]

    const createdTypes = []
    for (const rt of roomTypesData) {
        const type = await prisma.roomType.create({
            data: {
                ...rt,
                hotelId: hotel.id
            }
        })
        createdTypes.push(type)
    }

    // 6. Create Physical Rooms
    console.log('Seeding Rooms...')
    const rooms = []
    // Deluxe: 101-105
    for (let i = 1; i <= 5; i++) {
        rooms.push({ roomNumber: `10${i}`, roomTypeId: createdTypes[0].id, status: 'CLEAN' })
    }
    // Family: 201-205
    for (let i = 1; i <= 5; i++) {
        rooms.push({ roomNumber: `20${i}`, roomTypeId: createdTypes[1].id, status: 'CLEAN' })
    }
    // Executive: 301-305
    for (let i = 1; i <= 5; i++) {
        rooms.push({ roomNumber: `30${i}`, roomTypeId: createdTypes[2].id, status: 'INSPECTED' })
    }

    for (const r of rooms) {
        await prisma.room.create({ data: r })
    }

    // 7. Create Rate Plan (Standard)
    const ratePlan = await prisma.ratePlan.create({
        data: {
            hotelId: hotel.id,
            name: 'Standard Rate',
            cancellationRule: 'Free cancellation up to 24 hours before check-in',
            includesBreakfast: true
        }
    })

    // 8. Create Sample Bookings (Past & Future)
    console.log('Seeding Bookings...')

    const today = new Date()

    // Helper to add days
    const addDays = (d, days) => {
        const result = new Date(d);
        result.setDate(result.getDate() + days);
        return result;
    }

    // Past Booking (Completed)
    await prisma.booking.create({
        data: {
            hotelId: hotel.id,
            roomTypeId: createdTypes[0].id,
            ratePlanId: ratePlan.id,
            checkIn: addDays(today, -5),
            checkOut: addDays(today, -2),
            guestsAdult: 2,
            guestsChild: 0,
            totalAmount: 10500,
            status: 'checked_out',
            leadName: 'John Doe',
            leadEmail: 'john@example.com',
            leadPhone: '+66812345678',
            roomId: (await prisma.room.findFirst({ where: { roomNumber: '101' } })).id,
            payment: {
                create: {
                    amount: 10500,
                    status: 'captured',
                    provider: 'stripe',
                    method: 'card'
                }
            },
            guests: {
                create: [{ name: 'John Doe' }, { name: 'Jane Doe' }]
            }
        }
    })

    // Current Booking 1 (Checked In)
    await prisma.booking.create({
        data: {
            hotelId: hotel.id,
            roomTypeId: createdTypes[1].id, // Family
            ratePlanId: ratePlan.id,
            checkIn: addDays(today, -1),
            checkOut: addDays(today, 2),
            guestsAdult: 3,
            guestsChild: 1,
            totalAmount: 16500,
            status: 'checked_in',
            leadName: 'Alice Smith',
            leadEmail: 'alice@example.com',
            leadPhone: '+66898765432',
            roomId: (await prisma.room.findFirst({ where: { roomNumber: '201' } })).id,
            payment: {
                create: {
                    amount: 16500,
                    status: 'captured',
                    provider: 'manual',
                    method: 'cash'
                }
            },
            guests: {
                create: [{ name: 'Alice Smith' }, { name: 'Bob Smith' }]
            }
        }
    })

    // Current Booking 2 (Confirmed, arriving today)
    await prisma.booking.create({
        data: {
            hotelId: hotel.id,
            roomTypeId: createdTypes[2].id, // Executive
            ratePlanId: ratePlan.id,
            checkIn: today,
            checkOut: addDays(today, 1),
            guestsAdult: 1,
            guestsChild: 0,
            totalAmount: 2800,
            status: 'confirmed',
            leadName: 'Robert Brown',
            leadEmail: 'robert@example.com',
            leadPhone: '+66811223344',
            roomId: (await prisma.room.findFirst({ where: { roomNumber: '301' } })).id,
            guests: {
                create: [{ name: 'Robert Brown' }]
            }
        }
    })

    // Future Booking
    await prisma.booking.create({
        data: {
            hotelId: hotel.id,
            roomTypeId: createdTypes[0].id,
            ratePlanId: ratePlan.id,
            checkIn: addDays(today, 10),
            checkOut: addDays(today, 15),
            guestsAdult: 2,
            guestsChild: 0,
            totalAmount: 17500,
            status: 'confirmed',
            leadName: 'Future Guest',
            leadEmail: 'future@example.com',
            leadPhone: '+66998877665',
            roomId: (await prisma.room.findFirst({ where: { roomNumber: '102' } })).id,
            guests: {
                create: [{ name: 'Future Guest' }]
            }
        }
    })

    console.log('✅ Seeding Complete!')
    console.log(`New Hotel ID: ${hotel.id}`)
    console.log(`Login: ${targetEmail} / ${targetPassword}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
