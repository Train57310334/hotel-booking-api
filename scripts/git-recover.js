const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..', 'src', 'modules', 'bookings');
const servicePath = path.join(basePath, 'bookings.service.ts');
const controllerPath = path.join(basePath, 'bookings.controller.ts');

try {
    // Try to use git from environment if possible, or fallback to simple undo via copy if available
    // Assuming git is in path for node environment even if not for powershell process
    console.log("Attempting `git checkout ...` via child_process");
    execSync('git checkout HEAD src/modules/bookings/bookings.service.ts src/modules/bookings/bookings.controller.ts', { cwd: path.join(__dirname, '..') });
    console.log("Restored successfully from git.");
} catch (e) {
    console.error("Git failed.", e.message);
}
