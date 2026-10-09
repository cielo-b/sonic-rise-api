import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { extname } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly log = new Logger(StorageService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get('MINIO_BUCKET', 'sonicrise-media');
    this.publicUrl = config.get('MINIO_PUBLIC_URL', 'http://localhost:9000');

    this.client = new Minio.Client({
      endPoint: config.get('MINIO_ENDPOINT', 'localhost'),
      port: config.get<number>('MINIO_PORT', 9000),
      useSSL: config.get('MINIO_USE_SSL') === 'true',
      accessKey: config.getOrThrow('MINIO_ACCESS_KEY'),
      secretKey: config.getOrThrow('MINIO_SECRET_KEY'),
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.log.log(`Bucket created: ${this.bucket}`);
      }
      // Allow public read so portfolio images are accessible without auth
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      });
      await this.client.setBucketPolicy(this.bucket, policy);
      this.log.log(`Storage ready — bucket: ${this.bucket}`);
    } catch (err: unknown) {
      // Warn but don't crash — MinIO may not be running in all environments
      this.log.warn(`Storage init skipped: ${(err as Error).message}`);
    }
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'portfolio',
  ): Promise<string> {
    const ext = extname(originalName).toLowerCase() || '.bin';
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });

    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  async delete(url: string): Promise<void> {
    try {
      // Extract object key from URL: http://host:port/bucket/folder/file.ext → folder/file.ext
      const key = url.split(`/${this.bucket}/`)[1];
      if (key) await this.client.removeObject(this.bucket, key);
    } catch {
      /* ignore — object may not exist */
    }
  }
}
