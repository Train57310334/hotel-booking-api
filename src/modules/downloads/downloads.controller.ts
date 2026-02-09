import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('downloads')
@ApiBearerAuth()
@Controller('downloads')
export class DownloadsController {

  @Get('plugin/wordpress')
  @UseGuards(JwtAuthGuard) // Open to all logged-in users (or restrict to admin)
  async downloadPlugin(@Res() res: Response) {
    const pluginDir = path.resolve(__dirname, '../../../../kb-hotel-booking'); 
    // Go up from src/modules/downloads/downloads.controller.ts -> src/modules/downloads -> src/modules -> src -> root -> hotel-booking -> kb-hotel-booking
    // Actually, depends on where dist/ is.
    // In dev: src/modules/downloads/..
    // Better to use process.cwd() or similar if possible, or relative path carefully.
    // Let's try process.cwd() assuming it runs from project root.

    const rootDir = process.cwd().replace('hotel-booking-nest-postgres', ''); // Go up one level if needed? 
    // Wait, the workspace has `hotel-booking-nest-postgres` inside `hotel-booking`.
    // The `kb-hotel-booking` is in `hotel-booking/kb-hotel-booking`.
    // The nest app is in `hotel-booking/hotel-booking-nest-postgres`.
    // So `kb-hotel-booking` is `../kb-hotel-booking` relative to the nest app root.

    const sourceDir = path.join(process.cwd(), '../kb-hotel-booking');

    if (!fs.existsSync(sourceDir)) {
      return res.status(404).send('Plugin directory not found at ' + sourceDir);
    }

    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    res.attachment('kb-hotel-booking.zip');

    archive.pipe(res);

    // Append files from a sub-directory, putting its contents at the root of archive
    archive.directory(sourceDir, 'kb-hotel-booking');

    await archive.finalize();
  }
}
