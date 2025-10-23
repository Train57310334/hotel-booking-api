# Hotel Booking API (NestJS + PostgreSQL + Prisma)

Modular NestJS project for Hotel Booking: Auth, Users, Hotels, Room Types, Availability, Rates, Search, Pricing, Bookings, Payments, Promotions, Reviews, Reports, Notifications, Admin endpoints (skeleton).

## Quick start
1) Copy `.env.example` to `.env` and adjust if needed.
2) `docker-compose up -d` (start PostgreSQL)
3) `npm install`
4) `npx prisma generate`
5) `npx prisma migrate dev --name init`
6) `npm run seed`
7) `npm run start:dev`
8) Visit Swagger: `http://localhost:${PORT}/api-docs` (default 3000)

## Seed
The `prisma/seed.ts` inserts: one hotel, two room types, inventory, rate plans, overrides, promotions, and a demo user (email: demo@hotel.com / password: Demo1234!).

> This is a starter kit with clear places marked as TODO for real logic (pricing, availability checks, etc.).
