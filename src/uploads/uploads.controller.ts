import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from './cloudinary.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  /**
   * POST /uploads/signed-url
   * Returns a signed Cloudinary upload URL for direct-to-cloud uploads.
   * URL expires in 5 minutes and is bound to the upload preset.
   */
  @Post('signed-url')
  async getSignedUploadUrl() {
    return this.cloudinary.generateSignedUploadUrl();
  }

  /**
   * POST /uploads/image
   * Accepts multipart/form-data with a single "image" field.
   * Returns { url, publicId, width, height }
   */
  @Post('image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB guard at multer level
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No image file provided');
    return this.cloudinary.uploadImage(file);
  }
}
