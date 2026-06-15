import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('R2_BUCKET_NAME') || process.env.R2_BUCKET_NAME || 'jobin-resumes';
    this.endpoint = config.get<string>('R2_ENDPOINT') || process.env.R2_ENDPOINT || '';

    this.client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      credentials: {
        accessKeyId:     config.get<string>('R2_ACCESS_KEY_ID') || process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY') || process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }

  // ─── Upload ────────────────────────────────────────────────────────────────

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'resumes',
  ): Promise<S3UploadResult> {
    const ext  = originalName.split('.').pop() ?? 'bin';
    const key  = `${folder}/${uuid()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket:      this.bucket,
          Key:         key,
          Body:        buffer,
          ContentType: mimeType,
          // Removed ServerSideEncryption as R2 encrypts by default and AES256 param fails on R2
        }),
      );

      const url = `${this.endpoint}/${this.bucket}/${key}`;
      this.logger.log(`Uploaded ${key} (${buffer.length} bytes) to Cloudflare R2`);
      return { key, url, bucket: this.bucket };
    } catch (err) {
      this.logger.error(
        `R2 upload failed — bucket: ${this.bucket}, endpoint: ${this.endpoint}, key: ${key}\n` +
        `Error code: ${err.Code ?? err.code ?? 'unknown'}\n` +
        `Error message: ${err.message}\n` +
        `Full error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
      );
      throw new InternalServerErrorException(`File upload to Cloudflare R2 failed: ${err.message}`);
    }
  }

  // ─── Pre-signed download URL (15-minute expiry) ────────────────────────────

  async getPresignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    try {
      const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      return getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds });
    } catch (err) {
      this.logger.error(`Failed to generate R2 pre-signed URL for ${key}: ${err.message}`);
      throw new InternalServerErrorException('Could not generate download URL');
    }
  }

  // ─── Download (returns raw Buffer for text extraction) ────────────────────

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const { Body } = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );

      // Body is a Readable stream in Node.js — collect all chunks
      const chunks: Buffer[] = [];
      for await (const chunk of Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (err) {
      this.logger.error(`R2 download failed for ${key}: ${err.message}`);
      throw new InternalServerErrorException('Could not download file from Cloudflare R2');
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.logger.log(`Deleted R2 object: ${key}`);
    } catch (err) {
      // Log but don't throw — a missing file on delete is usually not fatal
      this.logger.warn(`R2 delete failed for ${key}: ${err.message}`);
    }
  }

  // ─── Exists check ─────────────────────────────────────────────────────────

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
