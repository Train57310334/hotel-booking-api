import { Controller, Post, Body, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, Get, Res, UseGuards } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('guests')
@ApiBearerAuth()
@Controller('guests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  @Roles('owner', 'admin', 'reception')
  async addGuest(@Body() body: any) {
    return this.guestsService.addGuest(body);
  }

  @Delete(':id')
  @Roles('owner', 'admin', 'reception')
  async removeGuest(@Param('id') id: string) {
    return this.guestsService.removeGuest(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `guest-doc-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
        return callback(new BadRequestException('Only image files mean are allowed!'), false);
      }
      callback(null, true);
    },
  }))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File is not provided');
    }
    // Return URL pointing to this controller's serve method
    return { url: `/guests/uploads/${file.filename}` };
  }

  @Get('uploads/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './uploads' });
  }
}
