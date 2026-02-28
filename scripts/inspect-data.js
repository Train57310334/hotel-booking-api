const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Fetching hotels...')
    const hotels = await prisma.hotel.findMany({
        include: {
            _count: {
                select: { bookings: true, roomTypes: true }
            }
        }
    })

    console.log('--- Hotels ---')
    if (hotels.length === 0) console.log('No hotels found.')
    hotels.forEach(h => {
        console.log(`${h.id}: ${h.name} (${h._count.roomTypes} room types, ${h._count.bookings} bookings)`)
    })

    console.log('\n--- Admin Users ---')
    const users = await prisma.user.findMany({
        where: {
            roles: {
                hasSome: ['hotel_admin', 'platform_admin', 'admin', 'owner'] // catch more roles just in case
            }
        }
    })
    if (users.length === 0) console.log('No admin users found.')
    users.forEach(u => {
        console.log(`${u.id}: ${u.name} (${u.email}) - Roles: ${u.roles}`)
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => await prisma.$disconnect())
