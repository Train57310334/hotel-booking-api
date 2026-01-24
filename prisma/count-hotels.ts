
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const count = await prisma.hotel.count()
  console.log(`Hotel Count: ${count}`)
}
main()
