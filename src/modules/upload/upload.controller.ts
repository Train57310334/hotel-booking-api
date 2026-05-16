import { Controller, Post, Get, Param, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';

// Ensure uploads directory exists at startup
const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: UPLOAD_DIR,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  uploadFile(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required');
    // Return API-relative URL so the file is accessible from any frontend domain
    return { url: `/api/upload/files/${file.filename}` };
  }

  @Get('files/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    // Sanitize filename to prevent directory traversal
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = join(UPLOAD_DIR, safeName);
    if (!existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    return res.sendFile(filePath);
  }
}
