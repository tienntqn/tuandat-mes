// Seed data mẫu — sẽ hoàn thiện ở Giai đoạn 1
// Chạy: npx ts-node prisma/seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seed sẽ được bổ sung đầy đủ ở PROMPT 1 (Database Schema)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
