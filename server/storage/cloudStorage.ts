import AWS from 'aws-sdk';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export interface CloudStorageConfig {
  provider: 'aws-s3' | 'supabase' | 'local';
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export class CloudStorageService {
  private config: CloudStorageConfig;
  private s3?: AWS.S3;
  private supabase?: any;

  constructor(config: CloudStorageConfig) {
    this.config = config;
    this.initializeProvider();
  }

  private initializeProvider() {
    switch (this.config.provider) {
      case 'aws-s3':
        this.s3 = new AWS.S3({
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
          region: this.config.region || 'us-east-1'
        });
        break;
      
      case 'supabase':
        this.supabase = createClient(
          this.config.supabaseUrl!,
          this.config.supabaseKey!
        );
        break;
      
      case 'local':
        // Use local file system (current approach)
        break;
    }
  }

  async uploadFile(
    filePath: string, 
    key: string, 
    mimeType: string
  ): Promise<UploadResult> {
    const stats = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    switch (this.config.provider) {
      case 'aws-s3':
        return this.uploadToS3(fileBuffer, key, mimeType, stats.size);
      
      case 'supabase':
        return this.uploadToSupabase(fileBuffer, key, mimeType, stats.size);
      
      case 'local':
        return this.uploadToLocal(filePath, key, mimeType, stats.size);
      
      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  private async uploadToS3(
    fileBuffer: Buffer, 
    key: string, 
    mimeType: string, 
    size: number
  ): Promise<UploadResult> {
    const params = {
      Bucket: this.config.bucket!,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read' // Make files publicly accessible
    };

    const result = await this.s3!.upload(params).promise();
    
    return {
      url: result.Location,
      key: key,
      size: size,
      mimeType: mimeType
    };
  }

  private async uploadToSupabase(
    fileBuffer: Buffer, 
    key: string, 
    mimeType: string, 
    size: number
  ): Promise<UploadResult> {
    const { data, error } = await this.supabase!.storage
      .from('audio-files')
      .upload(key, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrl } = this.supabase!.storage
      .from('audio-files')
      .getPublicUrl(key);

    return {
      url: publicUrl.publicUrl,
      key: key,
      size: size,
      mimeType: mimeType
    };
  }

  private async uploadToLocal(
    filePath: string, 
    key: string, 
    mimeType: string, 
    size: number
  ): Promise<UploadResult> {
    // For local storage, just return the local path
    // This maintains compatibility with current setup
    return {
      url: `/api/files/${key}`,
      key: key,
      size: size,
      mimeType: mimeType
    };
  }

  async deleteFile(key: string): Promise<void> {
    switch (this.config.provider) {
      case 'aws-s3':
        await this.s3!.deleteObject({
          Bucket: this.config.bucket!,
          Key: key
        }).promise();
        break;
      
      case 'supabase':
        await this.supabase!.storage
          .from('audio-files')
          .remove([key]);
        break;
      
      case 'local':
        // For local storage, file deletion is handled by the file system
        break;
    }
  }

  async getFileUrl(key: string): Promise<string> {
    switch (this.config.provider) {
      case 'aws-s3':
        return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
      
      case 'supabase':
        const { data } = this.supabase!.storage
          .from('audio-files')
          .getPublicUrl(key);
        return data.publicUrl;
      
      case 'local':
        return `/api/files/${key}`;
      
      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  // Generate unique key for file
  generateKey(originalFilename: string, segmentId?: number): string {
    const ext = path.extname(originalFilename);
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    
    if (segmentId) {
      return `segments/${segmentId}/${timestamp}-${random}${ext}`;
    }
    
    return `uploads/${timestamp}-${random}${ext}`;
  }
}

// Factory function to create storage service
export function createStorageService(): CloudStorageService {
  const config: CloudStorageConfig = {
    provider: (process.env.STORAGE_PROVIDER as any) || 'local',
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_S3_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY
  };

  return new CloudStorageService(config);
}
