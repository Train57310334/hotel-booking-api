import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require specific capabilities/permissions to access this endpoint.
 * @param permissions List of required permissions (e.g., 'manage:rooms', 'read:bookings')
 * 
 * Note: If multiple permissions are specified, the user only needs ONE of them (OR logic by default).
 * If you need AND logic, it's better to verify within the service or create a custom decorator.
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
