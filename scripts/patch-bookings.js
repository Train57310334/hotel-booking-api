const fs = require('fs');

const path = 'c:/Users/ASUS/workspace/hotel-booking/hotel-booking-nest-postgres/src/modules/bookings/bookings.service.ts';
let content = fs.readFileSync(path, 'utf8');

const targetFunction = `
  // ─── GUEST PORTAL ──────────────────────────────────────────────────────────

  async findMyBookings(userId: string) {
    if (!userId) throw new BadRequestException('User ID is required');
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        hotel: { select: { name: true, address: true, images: true, phone: true } },
        roomType: { select: { name: true, images: true } },
        room: { select: { roomNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────`;

if (!content.includes('findMyBookings')) {
    // Inject right before findAll method
    content = content.replace('  async findAll(', targetFunction + '\n\n  async findAll(');
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully injected findMyBookings');
} else {
    console.log('findMyBookings already exists');
}
