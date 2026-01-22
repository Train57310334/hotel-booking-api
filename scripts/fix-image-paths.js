const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fixing image paths...');
    const roomTypes = await prisma.roomType.findMany();

    for (const rt of roomTypes) {
        let updated = false;
        const newImages = rt.images.map(img => {
            if (img.includes('/brain/')) {
                updated = true;
                // Extract filename and prepend /images/
                const filename = img.split('/').pop();
                return `/images/${filename}`;
            }
            return img;
        });

        if (updated) {
            await prisma.roomType.update({
                where: { id: rt.id },
                data: { images: newImages }
            });
            console.log(`Updated images for ${rt.name}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
