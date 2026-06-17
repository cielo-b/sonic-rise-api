import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class StorageService implements OnModuleInit {
    private readonly config;
    private readonly log;
    private readonly client;
    private readonly bucket;
    private readonly publicUrl;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    upload(buffer: Buffer, originalName: string, mimeType: string, folder?: string): Promise<string>;
    delete(url: string): Promise<void>;
}
