"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = void 0;
exports.ROLE_PERMISSIONS = {
    platform_admin: ['*'],
    owner: ['*'],
    admin: [
        'manage:settings',
        'manage:staff',
        'view:reports',
        'manage:promotions',
        'manage:bookings',
        'read:bookings',
        'manage:guests',
        'read:guests',
        'manage:rooms',
        'read:rooms',
        'update:room_status',
        'manage:room_types',
        'manage:inventory',
        'read:inventory',
        'manage:prices',
        'read:prices'
    ],
    manager: [
        'view:reports',
        'manage:bookings',
        'read:bookings',
        'manage:guests',
        'read:guests',
        'manage:rooms',
        'read:rooms',
        'update:room_status',
        'read:inventory',
        'read:prices'
    ],
    reception: [
        'write:bookings',
        'read:bookings',
        'read:guests',
        'read:rooms',
        'update:room_status',
        'read:inventory',
        'read:prices'
    ],
    cleaner: [
        'read:rooms',
        'update:room_status'
    ]
};
//# sourceMappingURL=role-permissions.config.js.map