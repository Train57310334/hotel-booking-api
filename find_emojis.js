const fs = require('fs');
const path = require('path');

const emojiRegex = /\p{Emoji_Presentation}/gu;
const targetDir = 'C:\\Users\\ASUS\\workspace\\hotel-booking\\hotel-booking-nest-postgres\\src';
const targetDir2 = 'C:\\Users\\ASUS\\workspace\\hotel-booking\\hotel-booking-nest-postgres\\scripts';

function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('dist')) {
                scanDir(fullPath);
            }
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (emojiRegex.test(line)) {
                    console.log(`[${index + 1}] ${fullPath.replace(targetDir, '')}: ${line.trim()}`);
                }
            });
        }
    }
}

console.log('Scanning for emojis in backend...');
scanDir(targetDir);
scanDir(targetDir2);
console.log('Done.');
