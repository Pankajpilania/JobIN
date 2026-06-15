import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly configService: ConfigService) {
    this.region = configService.get<string>('AWS_REGION') || 'eu-west-2';
    this.bucket = configService.get<string>('AWS_S3_BUCKET') || '';

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.s3.send(command);

      const publicUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      this.logger.log(`Uploaded file to S3: ${key}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`);
      throw new InternalServerErrorException('Failed to upload file to storage');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3.send(command);
      this.logger.log(`Deleted file from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete file from storage');
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`);
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }
}
