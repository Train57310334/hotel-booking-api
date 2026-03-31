/**
 * ===================================================================
 *   FULL DEMO SEED SCRIPT — Hotel PMS (Phase 1–10)
 *   Usage: node scripts/seed-full-demo.js
 *
 *   WARNING: This will DELETE all hotel data and re-seed from scratch.
 *   Safe to run repeatedly. Admin user is preserved (or created).
 * ===================================================================
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// ─── Helper Utilities ────────────────────────────────────────────────────────

function addDays(date, days) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
}

function floorMidnight(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Guest Names for Demo ─────────────────────────────────────────────────────

const GUEST_NAMES = [
    'Somchai Jaidee', 'Nattaporn Suksai', 'Wanchai Rattana', 'Alisa Meesuk',
    'Prapas Boonsri', 'Ladda Thongchai', 'Chaiyaphat Khamphon', 'Siriporn Kaewsri',
    'Oliver Henderson', 'Emma Richardson', 'Liam Fitzgerald', 'Sophie Turner',
    'Michael Chen', 'Yuki Tanaka', 'Priya Sharma', 'Carlos Mendez',
    'Narumon Sookjai', 'Phakamas Wiriya', 'Thanakorn Bunsri', 'Arada Jitpong',
    'James Wilson', 'Natalie Moore', 'Daniel Nguyen', 'Anna Kowalski',
]

const NATIONALITIES = ['Thai', 'Japanese', 'British', 'Australian', 'Chinese', 'German', 'American', 'French']

const FOLIO_TYPES = ['ROOM_SERVICE', 'LAUNDRY', 'MINIBAR', 'OTHER']
const FOLIO_DESCS = {
    ROOM_SERVICE: ['Pad Thai & Spring Rolls', 'Club Sandwich + Coke', 'Beef Massaman Curry', 'Breakfast Tray (full set)', 'Fruit Platter'],
    LAUNDRY: ['Express Dry Cleaning (Suit)', 'Laundry Bag (2 kg)', 'Ironing Service'],
    MINIBAR: ['Singha Beer ×2', 'Evian 500ml ×3', 'Pringles + Chocolate', 'Sparkling Water ×2'],
    OTHER: ['Airport Transfer (van)', 'Spa Massage 60 min', 'Late Checkout Fee', 'Extra Bed', 'Baby Cot Setup']
}

const REVIEW_COMMENTS = [
    { msg: 'The riverside view was absolutely stunning. Staff were incredibly friendly and helpful throughout our stay.', rating: 5 },
    { msg: 'Beautiful hotel with amazing amenities. The pool was perfect and the breakfast buffet was outstanding.', rating: 5 },
    { msg: 'Great location and comfortable rooms. The spa experience was absolutely worth it.', rating: 4 },
    { msg: 'Very clean and modern rooms. The evening turndown service was a nice touch.', rating: 4 },
    { msg: 'Good hotel overall. Room was a bit small but the view more than made up for it.', rating: 4 },
    { msg: 'Check-in process was smooth and fast. Staff exceeded all expectations. Will return!', rating: 5 },
    { msg: 'Decent stay. Room service was a bit slow but food was excellent quality.', rating: 3 },
    { msg: 'Perfect for business travel. High-speed Wi-Fi, great workspace, and express laundry within 4 hours.', rating: 5 },
    { msg: 'Family suite had plenty of space for all of us. Kids loved the pool area.', rating: 4 },
    { msg: 'The bed was incredibly comfortable and the room was spotless upon arrival.', rating: 5 },
]

// ─── MAIN SEED ───────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🚧  HOTEL PMS — FULL DEMO SEED (Phase 1–10)\n')

    const today = floorMidnight(new Date())

    // ── 1. Admin User ────────────────────────────────────────────────────────
    const ADMIN_EMAIL = 'admin@bookingkub.com'
    const ADMIN_PASS = 'password123'

    let adminUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
    if (!adminUser) {
        const passwordHash = await bcrypt.hash(ADMIN_PASS, 10)
        adminUser = await prisma.user.create({
            data: { email: ADMIN_EMAIL, passwordHash, name: 'Hotel Demo Admin', roles: ['user', 'hotel_admin', 'platform_admin'] }
        })
        console.log('✅  Created Admin user')
    } else {
        console.log(`✅  Admin user exists: ${adminUser.id}`)
    }

    // ── 2. Clear Existing Hotel Data ─────────────────────────────────────────
    console.log('\n🗑️   Clearing old hotel data...')
    await prisma.roleAssignment.deleteMany({})
    await prisma.yieldRule.deleteMany({})
    await prisma.maintenanceReport.deleteMany({})
    await prisma.message.deleteMany({})
    await prisma.review.deleteMany({})
    await prisma.expense.deleteMany({})
    await prisma.promotion.deleteMany({})
    await prisma.notification.deleteMany({})
    await prisma.dailyStat.deleteMany({})
    await prisma.payment.deleteMany({})
    await prisma.folioCharge.deleteMany({})
    await prisma.guest.deleteMany({})
    await prisma.booking.deleteMany({})
    await prisma.rateOverride.deleteMany({})
    await prisma.ratePlan.deleteMany({})
    await prisma.roomStatusLog.deleteMany({})
    await prisma.room.deleteMany({})
    await prisma.inventoryCalendar.deleteMany({})
    await prisma.roomType.deleteMany({})
    await prisma.hotel.deleteMany({})
    console.log('✅  Data cleared')

    // ── 3. Hotel ─────────────────────────────────────────────────────────────
    console.log('\n🏨  Creating The Siam Riverside Hotel...')
    const hotel = await prisma.hotel.create({
        data: {
            name: 'The Siam Riverside',
            description: 'Experience luxury living by the majestic Chao Phraya River. Our hotel offers world-class amenities, breathtaking views, and exceptional service for a memorable stay in Bangkok.',
            address: '123 Charoen Nakhon Rd, Khlong Ton Sai, Khlong San',
            city: 'Bangkok',
            country: 'Thailand',
            contactEmail: 'info@siamriverside.com',
            contactPhone: '+66 2 XXX XXXX',
            imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200',
            package: 'PRO',
            ownerId: adminUser.id,
            amenities: ['Outdoor Pool', 'Spa & Wellness', 'Fitness Center', 'Restaurant', 'Rooftop Bar', 'Free Wi-Fi', 'Valet Parking', 'Concierge 24h', 'Airport Transfer', 'Business Center'],
            hasPromotions: true,
            hasOnlinePayment: true,
            hasAdvancedAnalytics: true,
        }
    })

    await prisma.roleAssignment.create({
        data: { userId: adminUser.id, hotelId: hotel.id, role: 'hotel_admin' }
    })
    console.log(`✅  Hotel created: ${hotel.id}`)

    // ── 4. Room Types ────────────────────────────────────────────────────────
    console.log('\n🛏️   Creating Room Types...')
    const roomTypesData = [
        {
            name: 'Deluxe River View',
            basePrice: 3800,
            sizeSqm: 45,
            bedConfig: 'King Bed',
            maxAdults: 2, maxChildren: 1,
            description: 'Elegant room with floor-to-ceiling windows offering panoramic river views. Features a private balcony, marble bathroom with rain shower, and curated minibar.',
            amenities: ['Free Wi-Fi', 'Air Conditioning', '55" Smart TV', 'Minibar', 'Private Balcony', 'Rain Shower', 'Safe', 'Nespresso Machine'],
            images: [
                'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=800',
                'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
                'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&q=80&w=800'
            ],
            isFeatured: true,
        },
        {
            name: 'Family River Suite',
            basePrice: 5800,
            sizeSqm: 80,
            bedConfig: '1 King + 2 Twin Beds',
            maxAdults: 4, maxChildren: 2,
            description: 'Expansive two-room suite perfect for families. Separate living area with sofa bed, full butler service, and access to the private rooftop plunge pool.',
            amenities: ['Free Wi-Fi', 'Air Conditioning', '65" Smart TV', 'Minibar', 'Separate Living Room', 'Bathtub & Shower', 'Kids\' Welcome Kit', 'Butler Service'],
            images: [
                'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
                'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800'
            ],
            isFeatured: false,
        },
        {
            name: 'Executive Studio',
            basePrice: 2900,
            sizeSqm: 38,
            bedConfig: 'Queen Bed',
            maxAdults: 2, maxChildren: 0,
            description: 'Designed for business travelers who demand efficiency. Features a large ergonomic workspace, dual monitors, and high-speed fiber Wi-Fi connection (500 Mbps).',
            amenities: ['Free Wi-Fi 500Mbps', 'Air Conditioning', '40" Smart TV', 'Dedicated Workspace', 'Coffee Machine', 'Ironing Facilities', 'Laptop Safe'],
            images: [
                'https://images.unsplash.com/photo-1631049307204-86db42d70990?auto=format&fit=crop&q=80&w=800',
                'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=800'
            ],
            isFeatured: false,
        },
        {
            name: 'Presidential Suite',
            basePrice: 18000,
            sizeSqm: 200,
            bedConfig: 'Master King + Sofa Bed',
            maxAdults: 4, maxChildren: 2,
            description: 'The pinnacle of luxury at The Siam Riverside. A private residence above Bangkok featuring a personal chef, rooftop Jacuzzi, private dining room, and 24/7 dedicated butler.',
            amenities: ['Private Rooftop Jacuzzi', 'In-Suite Dining Room', 'Personal Chef on Request', 'Butler 24h', 'Panoramic River Views', 'Home Theater', 'Wine Cellar', 'Pillow Menu'],
            images: [
                'https://images.unsplash.com/photo-1631049421450-348ccd7f8949?auto=format&fit=crop&q=80&w=800',
            ],
            isFeatured: true,
        }
    ]

    const roomTypes = []
    for (const rt of roomTypesData) {
        const type = await prisma.roomType.create({ data: { ...rt, hotelId: hotel.id } })
        roomTypes.push(type)
    }
    console.log(`✅  ${roomTypes.length} Room Types created`)

    // ── 5. Physical Rooms ────────────────────────────────────────────────────
    console.log('\n🚪  Creating Physical Rooms...')
    const roomsToCreate = [
        // Deluxe River View (Floor 1) — 8 rooms
        ...Array.from({ length: 8 }, (_, i) => ({ roomNumber: `10${i + 1}`, roomTypeId: roomTypes[0].id, status: 'CLEAN' })),
        // Family River Suite (Floor 2) — 5 rooms
        ...Array.from({ length: 5 }, (_, i) => ({ roomNumber: `20${i + 1}`, roomTypeId: roomTypes[1].id, status: 'CLEAN' })),
        // Executive Studio (Floor 3) — 6 rooms
        ...Array.from({ length: 6 }, (_, i) => ({ roomNumber: `30${i + 1}`, roomTypeId: roomTypes[2].id, status: 'INSPECTED' })),
        // Presidential Suite (Floor 4) — 2 rooms
        { roomNumber: '401', roomTypeId: roomTypes[3].id, status: 'CLEAN' },
        { roomNumber: '402', roomTypeId: roomTypes[3].id, status: 'CLEAN' },
    ]

    const createdRooms = []
    for (const r of roomsToCreate) {
        const room = await prisma.room.create({ data: { ...r } })
        createdRooms.push(room)
    }
    console.log(`✅  ${createdRooms.length} Rooms created`)

    // ── 6. Rate Plans ────────────────────────────────────────────────────────
    console.log('\n💲  Creating Rate Plans...')
    const standardRate = await prisma.ratePlan.create({
        data: {
            hotelId: hotel.id, name: 'Standard Flexible',
            cancellationRule: 'Free cancellation up to 24 hours before check-in.',
            includesBreakfast: false,
        }
    })

    const breakfastRate = await prisma.ratePlan.create({
        data: {
            hotelId: hotel.id, name: 'Breakfast Included',
            cancellationRule: 'Non-refundable.',
            includesBreakfast: true,
            breakfastPrice: 450,
        }
    })

    const longStayRate = await prisma.ratePlan.create({
        data: {
            hotelId: hotel.id, name: 'Long Stay (7+ Nights)',
            cancellationRule: 'Cancel 72h before arrival.',
            includesBreakfast: true,
            breakfastPrice: 450,
        }
    })
    console.log('✅  Rate Plans created')

    // ── 7. Rate Overrides (Weekend & Peak Dates) ─────────────────────────────
    console.log('\n📅  Seeding Rate Overrides (weekends & peak period)...')
    for (let offset = -14; offset <= 60; offset++) {
        const d = addDays(today, offset)
        const dow = d.getDay() // 0=Sun, 6=Sat
        const isWeekend = dow === 0 || dow === 5 || dow === 6

        if (isWeekend) {
            // +20% on weekends
            for (const rt of roomTypes) {
                await prisma.rateOverride.upsert({
                    where: { roomTypeId_ratePlanId_date: { roomTypeId: rt.id, ratePlanId: standardRate.id, date: d } },
                    create: { roomTypeId: rt.id, ratePlanId: standardRate.id, date: d, baseRate: Math.round(rt.basePrice * 1.2), reason: 'Weekend Premium' },
                    update: { baseRate: Math.round(rt.basePrice * 1.2) }
                })
            }
        }
    }
    // Peak period: Songkran +15 to +25 days from today = +40%
    for (let offset = 15; offset <= 25; offset++) {
        const d = addDays(today, offset)
        for (const rt of roomTypes) {
            await prisma.rateOverride.upsert({
                where: { roomTypeId_ratePlanId_date: { roomTypeId: rt.id, ratePlanId: standardRate.id, date: d } },
                create: { roomTypeId: rt.id, ratePlanId: standardRate.id, date: d, baseRate: Math.round(rt.basePrice * 1.4), reason: 'Peak Season / Songkran Festival' },
                update: { baseRate: Math.round(rt.basePrice * 1.4), reason: 'Peak Season / Songkran Festival' }
            })
        }
    }
    console.log('✅  Rate overrides seeded')

    // ── 8. Bookings (Past, Active, Future) ───────────────────────────────────
    console.log('\n📋  Seeding Bookings...')

    // Helper to find room by floor prefix
    const roomsByType = (typeIdx) => createdRooms.filter(r => r.roomTypeId === roomTypes[typeIdx].id)

    // Demo bookings template
    const bookingScenarios = [
        // Past checkouts with reviews
        { typeIdx: 0, roomNum: '101', namePick: 0, checkInOffset: -8, dur: 3, status: 'checked_out', amount: 11400, hasReview: true, reviewPick: 0 },
        { typeIdx: 0, roomNum: '102', namePick: 1, checkInOffset: -7, dur: 2, status: 'checked_out', amount: 7600, hasReview: true, reviewPick: 1 },
        { typeIdx: 1, roomNum: '201', namePick: 2, checkInOffset: -12, dur: 5, status: 'checked_out', amount: 29000, hasReview: true, reviewPick: 6 },
        { typeIdx: 2, roomNum: '301', namePick: 3, checkInOffset: -5, dur: 2, status: 'checked_out', amount: 5800, hasReview: true, reviewPick: 7 },
        { typeIdx: 0, roomNum: '103', namePick: 4, checkInOffset: -14, dur: 4, status: 'checked_out', amount: 15200, hasReview: false },
        { typeIdx: 2, roomNum: '302', namePick: 5, checkInOffset: -9, dur: 1, status: 'checked_out', amount: 2900, hasReview: true, reviewPick: 2 },
        { typeIdx: 3, roomNum: '401', namePick: 6, checkInOffset: -10, dur: 2, status: 'checked_out', amount: 36000, hasReview: true, reviewPick: 4 },
        { typeIdx: 0, roomNum: '104', namePick: 7, checkInOffset: -4, dur: 2, status: 'checked_out', amount: 7600, hasReview: false },

        // Currently checked in
        { typeIdx: 0, roomNum: '105', namePick: 8, checkInOffset: -1, dur: 3, status: 'checked_in', amount: 11400, hasReview: false },
        { typeIdx: 1, roomNum: '202', namePick: 9, checkInOffset: -2, dur: 4, status: 'checked_in', amount: 23200, hasReview: false },
        { typeIdx: 2, roomNum: '303', namePick: 10, checkInOffset: 0, dur: 2, status: 'checked_in', amount: 5800, hasReview: false },
        { typeIdx: 3, roomNum: '402', namePick: 11, checkInOffset: -1, dur: 3, status: 'checked_in', amount: 54000, hasReview: false },

        // Arriving today
        { typeIdx: 0, roomNum: '106', namePick: 12, checkInOffset: 0, dur: 2, status: 'confirmed', amount: 7600, hasReview: false },
        { typeIdx: 1, roomNum: '203', namePick: 13, checkInOffset: 0, dur: 5, status: 'confirmed', amount: 29000, hasReview: false },

        // Future confirmed
        { typeIdx: 0, roomNum: '107', namePick: 14, checkInOffset: 3, dur: 3, status: 'confirmed', amount: 11400, hasReview: false },
        { typeIdx: 1, roomNum: '204', namePick: 15, checkInOffset: 5, dur: 2, status: 'confirmed', amount: 11600, hasReview: false },
        { typeIdx: 2, roomNum: '304', namePick: 16, checkInOffset: 2, dur: 4, status: 'confirmed', amount: 11600, hasReview: false },
        { typeIdx: 0, roomNum: '108', namePick: 17, checkInOffset: 7, dur: 2, status: 'confirmed', amount: 7600, hasReview: false },
        { typeIdx: 3, roomNum: '401', namePick: 18, checkInOffset: 16, dur: 3, status: 'confirmed', amount: 54000, hasReview: false }, // Songkran (peak)
        { typeIdx: 2, roomNum: '305', namePick: 19, checkInOffset: 14, dur: 7, status: 'confirmed', amount: 20300, hasReview: false },
        { typeIdx: 1, roomNum: '205', namePick: 20, checkInOffset: 10, dur: 3, status: 'confirmed', amount: 17400, hasReview: false },

        // Cancelled/no-show for realism
        { typeIdx: 0, roomNum: '101', namePick: 21, checkInOffset: -20, dur: 2, status: 'cancelled', amount: 7600, hasReview: false },
        { typeIdx: 2, roomNum: '306', namePick: 22, checkInOffset: -15, dur: 1, status: 'no_show', amount: 2900, hasReview: false },
    ]

    const createdBookings = []
    for (const scene of bookingScenarios) {
        const name = GUEST_NAMES[scene.namePick % GUEST_NAMES.length]
        const checkIn = floorMidnight(addDays(today, scene.checkInOffset))
        const checkOut = floorMidnight(addDays(checkIn, scene.dur))

        // Find the room
        const room = createdRooms.find(r => r.roomNumber === scene.roomNum)
        if (!room) { console.warn(`  ⚠️  Room ${scene.roomNum} not found, skipping`); continue }

        const booking = await prisma.booking.create({
            data: {
                hotelId: hotel.id,
                roomTypeId: roomTypes[scene.typeIdx].id,
                ratePlanId: standardRate.id,
                roomId: room.id,
                checkIn,
                checkOut,
                guestsAdult: rand(1, roomTypes[scene.typeIdx].maxAdults),
                guestsChild: 0,
                totalAmount: scene.amount,
                status: scene.status,
                leadName: name,
                leadEmail: name.toLowerCase().replace(/ /g, '.') + '@example.com',
                leadPhone: `+66${rand(80, 99)}${rand(1000000, 9999999)}`,
                source: pick(['direct', 'agoda', 'booking.com', 'direct', 'direct']),
                payment: {
                    create: {
                        amount: scene.amount,
                        status: ['pending', 'cancelled', 'no_show'].includes(scene.status) ? 'pending' : 'captured',
                        provider: pick(['stripe', 'omise', 'manual', 'manual']),
                        method: pick(['credit_card', 'debit_card', 'cash', 'bank_transfer']),
                        currency: 'THB'
                    }
                },
                guests: {
                    create: [
                        { name, idType: 'passport', idNumber: `P${rand(1000000, 9999999)}` }
                    ]
                }
            }
        })
        createdBookings.push({ ...booking, scene })

        // Add folio charges on checked_in or checked_out bookings
        if (['checked_in', 'checked_out'].includes(scene.status) && Math.random() > 0.3) {
            const chargeCount = rand(1, 4)
            for (let c = 0; c < chargeCount; c++) {
                const type = pick(FOLIO_TYPES)
                await prisma.folioCharge.create({
                    data: {
                        bookingId: booking.id,
                        description: pick(FOLIO_DESCS[type]),
                        amount: rand(100, 1500),
                        type,
                        date: addDays(checkIn, rand(0, Math.max(0, scene.dur - 1)))
                    }
                })
            }
        }

        // Update room status based on booking state
        if (scene.status === 'checked_in') {
            await prisma.room.update({ where: { id: room.id }, data: { status: 'OCCUPIED' } })
        } else if (scene.status === 'checked_out') {
            await prisma.room.update({ where: { id: room.id }, data: { status: rand(0, 1) === 0 ? 'DIRTY' : 'CLEAN' } })
        }

        // Add review for past checkouts
        if (scene.hasReview && scene.reviewPick !== undefined) {
            const rev = REVIEW_COMMENTS[scene.reviewPick]
            await prisma.review.create({
                data: {
                    hotelId: hotel.id,
                    rating: rev.rating,
                    comment: rev.msg,
                    guestName: name,
                    source: 'post-stay-email',
                    status: 'approved',
                }
            })
        }
    }
    console.log(`✅  ${createdBookings.length} Bookings seeded`)

    // ── 9. Daily Stats (Night Audit history) ─────────────────────────────────
    console.log('\n📊  Seeding DailyStat records (Night Audit history — last 60 days)...')
    const totalRooms = createdRooms.length
    for (let offset = -60; offset <= -1; offset++) {
        const date = floorMidnight(addDays(today, offset))
        const occupiedRooms = rand(Math.floor(totalRooms * 0.4), Math.floor(totalRooms * 0.92))
        const totalRevenue = occupiedRooms * rand(2800, 5200)
        const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100)
        const adr = occupiedRooms > 0 ? Math.round(totalRevenue / occupiedRooms) : 0
        const revPar = Math.round(totalRevenue / totalRooms)

        await prisma.dailyStat.upsert({
            where: { date },
            create: { date, totalRevenue, totalBookings: occupiedRooms, occupiedRooms, occupancyRate, adr, revPar },
            update: { totalRevenue, totalBookings: occupiedRooms, occupiedRooms, occupancyRate, adr, revPar }
        })
    }
    console.log('✅  60 days of DailyStat seeded')

    // ── 10. Expenses (Accounting) ─────────────────────────────────────────────
    console.log('\n💼  Seeding Expenses (Accounting — last 60 days)...')
    const expenseTemplates = [
        // Monthly overheads
        { title: 'Electricity Bill', amount: 42000, category: 'utilities', offsetDay: -30 },
        { title: 'Water & Sewage', amount: 8500, category: 'utilities', offsetDay: -30 },
        { title: 'Internet & Telephone', amount: 4200, category: 'utilities', offsetDay: -30 },
        { title: 'Monthly Staff Salaries (Part 1)', amount: 145000, category: 'salary', offsetDay: -28 },
        { title: 'Monthly Staff Salaries (Part 2)', amount: 125000, category: 'salary', offsetDay: -14 },
        { title: 'Security Guard Contract', amount: 18000, category: 'salary', offsetDay: -28 },
        // Maintenance
        { title: 'AC Unit Repair — Room 204', amount: 7800, category: 'maintenance', offsetDay: -55 },
        { title: 'Pool Cleaning & Chemicals', amount: 3200, category: 'maintenance', offsetDay: -48 },
        { title: 'Elevator Annual Service', amount: 12000, category: 'maintenance', offsetDay: -45 },
        { title: 'Lobby Carpet Deep Clean', amount: 4500, category: 'maintenance', offsetDay: -20 },
        { title: 'Plumbing — Room 301', amount: 2800, category: 'maintenance', offsetDay: -10 },
        // Marketing
        { title: 'Google Ads Campaign (April)', amount: 18000, category: 'marketing', offsetDay: -32 },
        { title: 'LINE OA Monthly Fee', amount: 990, category: 'marketing', offsetDay: -30 },
        { title: 'Agoda Commission Payout', amount: 15200, category: 'marketing', offsetDay: -22 },
        { title: 'Booking.com Commission', amount: 9800, category: 'marketing', offsetDay: -8 },
        // Supplies
        { title: 'Linen & Towel Replacement', amount: 6800, category: 'supplies', offsetDay: -40 },
        { title: 'Amenities Restock (Soap, Shampoo)', amount: 3200, category: 'supplies', offsetDay: -35 },
        { title: 'Mini Bar Products', amount: 5400, category: 'supplies', offsetDay: -18 },
        { title: 'Restaurant F&B Ingredients', amount: 22000, category: 'supplies', offsetDay: -7 },
        // Tax / Admin
        { title: 'Business Insurance Premium', amount: 35000, category: 'general', offsetDay: -58 },
        { title: 'Accounting & Auditing Fee', amount: 8000, category: 'general', offsetDay: -45 },
        // Current month
        { title: 'Electricity Bill', amount: 39000, category: 'utilities', offsetDay: -2 },
        { title: 'Monthly Staff Salaries', amount: 142000, category: 'salary', offsetDay: -2 },
        { title: 'Facebook Ads (This Month)', amount: 12000, category: 'marketing', offsetDay: -5 },
    ]

    for (const exp of expenseTemplates) {
        await prisma.expense.create({
            data: {
                hotelId: hotel.id,
                title: exp.title,
                amount: exp.amount,
                category: exp.category,
                date: addDays(today, exp.offsetDay)
            }
        })
    }
    console.log(`✅  ${expenseTemplates.length} Expense entries seeded`)

    // ── 11. Maintenance Reports (Phase 6) ────────────────────────────────────
    console.log('\n🔧  Seeding Maintenance Reports...')
    const maintenanceScenarios = [
        { roomIdx: 2, category: 'Plumbing', description: 'Hot water pressure is very low in shower. Guest complained on day 2.', priority: 'HIGH', status: 'RESOLVED', resolvedAgo: -3 },
        { roomIdx: 5, category: 'Electrical', description: 'Bedside lamp not working. Bulb replacement needed.', priority: 'LOW', status: 'RESOLVED', resolvedAgo: -5 },
        { roomIdx: 8, category: 'Furniture', description: 'Rolling door stopper is broken. Door slams when wind blows.', priority: 'NORMAL', status: 'IN_PROGRESS', resolvedAgo: null },
        { roomIdx: 3, category: 'AC', description: 'Air conditioning unit making a loud clicking noise during cooling cycle.', priority: 'HIGH', status: 'OPEN', resolvedAgo: null },
        { roomIdx: 10, category: 'Plumbing', description: 'Small bathroom leak under sink. Drain appears slow.', priority: 'NORMAL', status: 'IN_PROGRESS', resolvedAgo: null },
        { roomIdx: 14, category: 'Electrical', description: 'TV remote control unresponsive. Needs battery replacement.', priority: 'LOW', status: 'RESOLVED', resolvedAgo: -7 },
        { roomIdx: 0, category: 'Furniture', description: 'Wardrobe door hinge loose. Door does not close properly.', priority: 'LOW', status: 'OPEN', resolvedAgo: null },
    ]

    for (const m of maintenanceScenarios) {
        const room = createdRooms[m.roomIdx % createdRooms.length]
        await prisma.maintenanceReport.create({
            data: {
                roomId: room.id,
                category: m.category,
                description: m.description,
                priority: m.priority,
                status: m.status,
                reportedBy: pick(['Malee (Housekeeping)', 'Somchai (Housekeeping)', 'Nong (Housekeeping)', 'Guest Report']),
                resolvedAt: m.resolvedAgo !== null ? addDays(today, m.resolvedAgo) : null,
            }
        })
    }
    console.log(`✅  ${maintenanceScenarios.length} Maintenance reports seeded`)

    // ── 12. Yield Rules (Phase 10) ───────────────────────────────────────────
    console.log('\n⚡  Seeding Yield Rules (Dynamic Pricing)...')
    const yieldRules = [
        {
            name: 'High Occupancy Surge',
            triggerType: 'OCCUPANCY', conditionOp: 'GREATER_THAN', conditionValue: 80,
            adjustmentType: 'PERCENTAGE', adjustmentOp: 'INCREASE', adjustmentValue: 20,
            isActive: true
        },
        {
            name: 'Last Minute Discount',
            triggerType: 'DAYS_TO_ARRIVAL', conditionOp: 'LESS_THAN', conditionValue: 3,
            adjustmentType: 'PERCENTAGE', adjustmentOp: 'DECREASE', adjustmentValue: 10,
            isActive: true
        },
        {
            name: 'Early Bird Boost',
            triggerType: 'DAYS_TO_ARRIVAL', conditionOp: 'GREATER_THAN', conditionValue: 45,
            adjustmentType: 'FIXED', adjustmentOp: 'DECREASE', adjustmentValue: 300,
            isActive: true
        },
        {
            name: 'Low Occupancy Flash Sale',
            triggerType: 'OCCUPANCY', conditionOp: 'LESS_THAN', conditionValue: 30,
            adjustmentType: 'PERCENTAGE', adjustmentOp: 'DECREASE', adjustmentValue: 15,
            isActive: false  // Disabled for now (shown as example of inactive rule)
        },
    ]

    for (const rule of yieldRules) {
        await prisma.yieldRule.create({
            data: { hotelId: hotel.id, ...rule }
        })
    }
    console.log(`✅  ${yieldRules.length} Yield rules seeded`)

    // ── 13. Reviews (Phase 8) ────────────────────────────────────────────────
    console.log('\n⭐  Seeding additional online Reviews...')
    const extraReviews = [
        { name: 'Sarah L.', rating: 5, comment: 'Absolute paradise! The Chao Phraya view from our room was breathtaking at sunset. Highly recommend the River View room!', source: 'google' },
        { name: 'Marco B.', rating: 4, comment: 'Very professional staff and immaculate rooms. The Thai buffet breakfast was exceptional. Only small complaint is parking is a little tight.', source: 'tripadvisor' },
        { name: 'Tanaka H.', rating: 5, comment: 'Perfect business hotel. Super-fast internet, quiet rooms, and the express laundry was back in 3 hours.', source: 'booking.com' },
        { name: 'Céline D.', rating: 4, comment: 'The spa was a highlight of our trip. Tried the Thai herbal compress massage — unforgettable. Will definitely return.', source: 'agoda' },
        { name: 'Jun Y.', rating: 5, comment: 'Room was spotless and the staff remembered my name every day. This is how hospitality should feel.', source: 'google' },
        { name: 'Anna K.', rating: 3, comment: 'Good hotel overall but the pool was a bit crowded during peak hours. Room service took 45 minutes.', source: 'booking.com' },
        { name: 'Michael T.', rating: 4, comment: 'Stayed in the Family Suite — incredible value for such spacious accommodation. Kids had a blast. Great location for river cruises.', source: 'tripadvisor' },
    ]

    for (const rev of extraReviews) {
        await prisma.review.create({
            data: {
                hotelId: hotel.id,
                rating: rev.rating,
                comment: rev.comment,
                guestName: rev.name,
                source: rev.source,
                status: 'approved',
            }
        })
    }
    console.log(`✅  ${extraReviews.length} Additional reviews seeded`)

    // ── 14. Messages ─────────────────────────────────────────────────────────
    console.log('\n📧  Seeding Messages...')
    const messages = [
        { name: 'Tanaka Hiroshi', email: 'tanaka@example.com', subject: 'Room upgrade availability', content: 'Hello, we are checking in on Saturday with 3 nights. Is it possible to upgrade to the Family Suite if available? Happy to pay extra.', status: 'read' },
        { name: 'Sophie Turner', email: 'sophie@example.com', subject: 'Late check-in request', content: 'Our flight arrives at midnight. Is it possible to do a late check-in? We have a reservation for 2 nights starting tomorrow.', status: 'unread' },
        { name: 'Priya Sharma', email: 'priya@example.com', subject: 'Birthday decoration request', content: "My husband's birthday is on our second day. Can you arrange a small surprise with balloons and a cake for Room 201? We'll pay for the service.", status: 'unread' },
        { name: 'Carlos M.', email: 'carlos@example.com', subject: 'Airport pickup', content: 'Can you arrange an airport pickup from Suvarnabhumi at 17:30 on the 28th? Party of 2 with luggage. How much does it cost?', status: 'replied' },
        { name: 'James Wilson', email: 'james@example.com', subject: 'Invoice request', content: 'Please resend our VAT invoice from booking #2024-1042. We stayed last week and need the document for corporate expense claim.', status: 'read' },
    ]

    for (const msg of messages) {
        await prisma.message.create({ data: { hotelId: hotel.id, ...msg } })
    }
    console.log(`✅  ${messages.length} Messages seeded`)

    // ── 15. Promotions ────────────────────────────────────────────────────────
    console.log('\n🏷️   Seeding Promotions...')
    await prisma.promotion.create({
        data: {
            hotelId: hotel.id,
            code: 'SONGKRAN2025',
            type: 'percent',
            value: 15,
            startDate: addDays(today, 10),
            endDate: addDays(today, 20),
            conditions: 'Minimum 2 nights. Songkran Festival Special.',
            maxUses: 100,
            usedCount: 23,
            isActive: true,
        }
    })
    await prisma.promotion.create({
        data: {
            hotelId: hotel.id,
            code: 'LONGSTAY7',
            type: 'fixed',
            value: 1500,
            startDate: addDays(today, -30),
            endDate: addDays(today, 90),
            conditions: 'Minimum 7 nights. Save 1,500 THB on total price.',
            maxUses: 50,
            usedCount: 8,
            isActive: true,
        }
    })
    console.log('✅  Promotions seeded')

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(55))
    console.log('   ✅  FULL DEMO SEED COMPLETE')
    console.log('═'.repeat(55))
    console.log(`   Hotel:     ${hotel.name}`)
    console.log(`   Hotel ID:  ${hotel.id}`)
    console.log(`   Login:     ${ADMIN_EMAIL}`)
    console.log(`   Password:  ${ADMIN_PASS}`)
    console.log('═'.repeat(55))
    console.log('\n📌  Seeded Summary:')
    console.log(`   🏨  1 Hotel, ${roomTypes.length} Room Types, ${createdRooms.length} Physical Rooms`)
    console.log(`   📋  ${createdBookings.length} Bookings (past/active/future/cancelled)`)
    console.log(`   📊  60 days DailyStat (Night Audit data)`)
    console.log(`   💼  ${expenseTemplates.length} Expense records`)
    console.log(`   💲  ${yieldRules.length} Yield Rules`)
    console.log(`   ⭐  ${extraReviews.length + REVIEW_COMMENTS.length} Reviews`)
    console.log(`   🔧  ${maintenanceScenarios.length} Maintenance Reports`)
    console.log(`   📧  ${messages.length} Messages`)
    console.log(`   🏷️   2 Promo Codes`)
    console.log('\n')
}

main()
    .catch(e => { console.error('❌  Seed Error:', e); process.exit(1) })
    .finally(async () => await prisma.$disconnect())
