export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // ─── Platform Admin ──────────────────────────────────────────────────────────
  platform_admin: ['*'], // Can do everything across all properties

  // ─── Property Roles ─────────────────────────────────────────────────────────
  owner: ['*'], // Can do everything within their property
  admin: [
    // Settings & Staff
    'manage:settings',
    'manage:staff',
    'view:reports',
    'manage:promotions',
    // Bookings & Guests
    'manage:bookings',
    'read:bookings',
    'manage:guests',
    'read:guests',
    // Inventory
    'manage:rooms',
    'read:rooms',
    'update:room_status',
    'manage:room_types',
    'manage:inventory',
    'read:inventory',
    // Financials
    'manage:prices',
    'read:prices'
  ],
  manager: [
    // Staff & Reports
    'view:reports',
    // Bookings & Guests
    'manage:bookings',
    'read:bookings',
    'manage:guests',
    'read:guests',
    // Inventory
    'manage:rooms',
    'read:rooms',
    'update:room_status',
    'read:inventory',
    // Financials
    'read:prices'
  ],
  reception: [
    // Bookings & Guests
    'write:bookings', // Create/Edit basic Info
    'read:bookings',
    'read:guests',
    // Inventory
    'read:rooms',
    'update:room_status',
    'read:inventory',
    // Financials
    'read:prices'
  ],
  cleaner: [
    // Very limited scope
    'read:rooms',
    'update:room_status'
  ]
};
