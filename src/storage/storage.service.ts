import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { extname } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly log = new Logger(StorageService.name);
  private readonly client: Minio.Client;
  /** Signs download links against the public address (signatures include the host). */
  private readonly signer: Minio.Client;
  private readonly bucket: string;
  /** Not publicly readable: client deliverables. */
  private readonly privateBucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get('MINIO_BUCKET', 'sonicrise-media');
    this.publicUrl = config.get('MINIO_PUBLIC_URL', 'http://localhost:9000');

    this.privateBucket = config.get(
      'MINIO_PRIVATE_BUCKET',
      `${this.bucket}-private`,
    );
    const accessKey = config.getOrThrow<string>('MINIO_ACCESS_KEY');
    const secretKey = config.getOrThrow<string>('MINIO_SECRET_KEY');

    this.client = new Minio.Client({
      endPoint: config.get('MINIO_ENDPOINT', 'localhost'),
      port: Number(config.get('MINIO_PORT', 9000)),
      useSSL: config.get('MINIO_USE_SSL') === 'true',
      accessKey,
      secretKey,
      region: 'us-east-1',
    });
    const pub = new URL(this.publicUrl);
    this.signer = new Minio.Client({
      endPoint: pub.hostname,
      port: pub.port ? Number(pub.port) : pub.protocol === 'https:' ? 443 : 80,
      useSSL: pub.protocol === 'https:',
      accessKey,
      secretKey,
      region: 'us-east-1',
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
      if (!(await this.client.bucketExists(this.privateBucket))) {
        await this.client.makeBucket(this.privateBucket);
        this.log.log(`Bucket created: ${this.privateBucket}`);
      }
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

  /** Stores a file in the private bucket and returns its object key. */
  async uploadPrivate(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string,
  ): Promise<string> {
    const ext = extname(originalName).toLowerCase() || '.bin';
    const key = `${folder}/${randomUUID()}${ext}`;
    await this.client.putObject(
      this.privateBucket,
      key,
      buffer,
      buffer.length,
      { 'Content-Type': mimeType },
    );
    return key;
  }

  /** Streams a file from disk into the private bucket (large deliverables). */
  async uploadPrivateFile(
    filePath: string,
    originalName: string,
    mimeType: string,
    folder: string,
  ): Promise<string> {
    const ext = extname(originalName).toLowerCase() || '.bin';
    const key = `${folder}/${randomUUID()}${ext}`;
    await this.client.fPutObject(this.privateBucket, key, filePath, {
      'Content-Type': mimeType,
    });
    return key;
  }

  /** A time-limited link to a private file; `download` forces a save-as with the original name. */
  privateUrl(
    key: string,
    fileName: string,
    opts: { download: boolean; seconds?: number },
  ): Promise<string> {
    const safeName = fileName.replace(/["\\\r\n]/g, '_');
    return this.signer.presignedGetObject(
      this.privateBucket,
      key,
      opts.seconds ?? 15 * 60,
      {
        'response-content-disposition': `${opts.download ? 'attachment' : 'inline'}; filename="${safeName}"`,
      },
    );
  }

  async removePrivate(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.privateBucket, key);
    } catch {
      /* already gone */
    }
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
