const fs = require('fs');

const path = 'c:/Users/ASUS/workspace/hotel-booking/hotel-booking-nest-postgres/src/modules/bookings/bookings.service.ts';
let content = fs.readFileSync(path, 'utf8');

const findAllMethod = `
  async findAll(hotelId: string, search?: string, status?: string, sortBy: string = 'createdAt', order: string = 'desc', page: number = 1, limit: number = 20) {
    const where: any = { hotelId };

    if (status && status !== 'All') {
      where.status = status.toLowerCase();
    }

    if (search) {
      where.OR = [
        { leadName: { contains: search, mode: 'insensitive' } },
        { leadEmail: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Default sort
    const orderBy: any = {};
    if (['createdAt', 'checkIn', 'checkOut', 'totalAmount', 'status'].includes(sortBy)) {
        orderBy[sortBy] = order === 'asc' ? 'asc' : 'desc';
    } else {
        orderBy.createdAt = 'desc';
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);

    const [data, total] = await Promise.all([
        this.prisma.booking.findMany({
            where,
            include: {
                hotel: true,
                user: true,
                roomType: true,
                room: true,
                payment: true,
                guests: true,
            },
            orderBy,
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
        }),
        this.prisma.booking.count({ where })
    ]);

    return {
        data,
        meta: {
            total,
            page: pageNum,
            last_page: Math.ceil(total / limitNum),
            limit: limitNum
        }
    };
  }
`;

// Append before the closing brace
content = content.replace(/}\s*$/, findAllMethod + '\n}');

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully injected findAll');
