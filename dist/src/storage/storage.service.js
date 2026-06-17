"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Minio = __importStar(require("minio"));
const path_1 = require("path");
const crypto_1 = require("crypto");
let StorageService = StorageService_1 = class StorageService {
    config;
    log = new common_1.Logger(StorageService_1.name);
    client;
    bucket;
    publicUrl;
    constructor(config) {
        this.config = config;
        this.bucket = config.get('MINIO_BUCKET', 'sonicrise-media');
        this.publicUrl = config.get('MINIO_PUBLIC_URL', 'http://localhost:9000');
        this.client = new Minio.Client({
            endPoint: config.get('MINIO_ENDPOINT', 'localhost'),
            port: config.get('MINIO_PORT', 9000),
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
            const policy = JSON.stringify({
                Version: '2012-10-17',
                Statement: [{
                        Effect: 'Allow',
                        Principal: '*',
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${this.bucket}/*`],
                    }],
            });
            await this.client.setBucketPolicy(this.bucket, policy);
            this.log.log(`Storage ready — bucket: ${this.bucket}`);
        }
        catch (err) {
            this.log.warn(`Storage init skipped: ${err.message}`);
        }
    }
    async upload(buffer, originalName, mimeType, folder = 'portfolio') {
        const ext = (0, path_1.extname)(originalName).toLowerCase() || '.bin';
        const key = `${folder}/${(0, crypto_1.randomUUID)()}${ext}`;
        await this.client.putObject(this.bucket, key, buffer, buffer.length, {
            'Content-Type': mimeType,
        });
        return `${this.publicUrl}/${this.bucket}/${key}`;
    }
    async delete(url) {
        try {
            const key = url.split(`/${this.bucket}/`)[1];
            if (key)
                await this.client.removeObject(this.bucket, key);
        }
        catch { }
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map