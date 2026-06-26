import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { createHmac } from 'crypto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export interface SignedUploadUrl {
  url: string;
  timestamp: number;
  signature: string;
  apiKey: string;
  uploadPreset: string;
  expiresAt: string;
}

@Injectable()
export class CloudinaryService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly cloudName: string;
  private readonly uploadPreset: string;

  constructor(config: ConfigService) {
    this.cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME') ?? '';
    this.apiKey = config.get<string>('CLOUDINARY_API_KEY') ?? '';
    this.apiSecret = config.get<string>('CLOUDINARY_API_SECRET') ?? '';
    this.uploadPreset = config.get<string>('CLOUDINARY_UPLOAD_PRESET') ?? 'stellaraid-upload';

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<UploadResult> {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type not allowed. Accepted: ${ALLOWED_TYPES.join(', ')}`);
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'StellarAid', resource_type: 'image' },
          (error, result) => {
            if (error || !result) {
              return reject(new InternalServerErrorException('Image upload failed'));
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
            });
          },
        )
        .end(file.buffer);
    });
  }

  generateSignedUploadUrl(): SignedUploadUrl {
    if (!this.apiKey || !this.apiSecret || !this.cloudName) {
      throw new InternalServerErrorException('Cloudinary is not configured properly');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const expiresAtUnix = timestamp + SIGNED_URL_EXPIRY_SECONDS;

    const paramsToSign = `folder=StellarAid&timestamp=${timestamp}&upload_preset=${this.uploadPreset}${this.apiSecret}`;
    const signature = createHmac('sha256', this.apiSecret)
      .update(paramsToSign)
      .digest('hex');

    return {
      url: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      timestamp,
      signature,
      apiKey: this.apiKey,
      uploadPreset: this.uploadPreset,
      expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
    };
  }
}
