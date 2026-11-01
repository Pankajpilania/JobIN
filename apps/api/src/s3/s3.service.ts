import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as common from 'oci-common';
import * as objectstorage from 'oci-objectstorage';
import { v4 as uuid } from 'uuid';

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
}

interface CachedDownloadUrl {
  id: string;
  url: string;
  expiresAt: number;
}

export type OciObjectStorageClient = Pick<
  objectstorage.ObjectStorageClient,
  | 'endpoint'
  | 'putObject'
  | 'createPreauthenticatedRequest'
  | 'deletePreauthenticatedRequest'
  | 'getObject'
  | 'deleteObject'
  | 'headObject'
>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getPublicEndpoint(endpoint: string): string {
  return endpoint.replace('{dualStack?ds.oci.:}', '');
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 404
  );
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly bucket: string;
  private readonly namespace: string;
  private readonly region: string;
  private clientPromise?: Promise<OciObjectStorageClient>;
  private readonly downloadUrls = new Map<string, CachedDownloadUrl>();
  private readonly downloadUrlRequests = new Map<string, Promise<string>>();

  constructor(private readonly config: ConfigService) {
    this.bucket = this.getRequiredSetting('OCI_OBJECT_STORAGE_BUCKET');
    this.namespace = this.getRequiredSetting('OCI_OBJECT_STORAGE_NAMESPACE');
    this.region = this.getRequiredSetting('OCI_REGION');
  }

  private getRequiredSetting(name: string): string {
    const value = this.config.get<string>(name) || process.env[name];
    if (!value?.trim()) throw new Error(`${name} is required for OCI Object Storage`);
    return value.trim();
  }

  private async getClient(): Promise<OciObjectStorageClient> {
    if (!this.clientPromise) this.clientPromise = this.createClient();
    try {
      return await this.clientPromise;
    } catch (error) {
      this.clientPromise = undefined;
      throw error;
    }
  }

  protected async createClient(): Promise<OciObjectStorageClient> {
    const authMode =
      this.config.get<string>('OCI_AUTH_MODE') ||
      process.env.OCI_AUTH_MODE ||
      (process.env.NODE_ENV === 'production' ? 'instance_principal' : 'config_file');
    let provider: common.AuthenticationDetailsProvider;

    if (authMode === 'instance_principal') {
      provider = await new common.InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
    } else if (authMode === 'config_file') {
      provider = new common.ConfigFileAuthenticationDetailsProvider(
        this.config.get<string>('OCI_CONFIG_FILE') || process.env.OCI_CONFIG_FILE,
        this.config.get<string>('OCI_PROFILE') || process.env.OCI_PROFILE,
      );
    } else {
      throw new Error(`Unsupported OCI_AUTH_MODE: ${authMode}`);
    }

    const client = new objectstorage.ObjectStorageClient({
      authenticationDetailsProvider: provider,
    });
    client.regionId = this.region;
    return client;
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'resumes',
  ): Promise<S3UploadResult> {
    const ext = originalName.split('.').pop() ?? 'bin';
    const key = `${folder}/${uuid()}.${ext}`;

    try {
      const client = await this.getClient();
      await client.putObject({
        namespaceName: this.namespace,
        bucketName: this.bucket,
        objectName: key,
        putObjectBody: buffer,
        contentLength: buffer.length,
        contentType: mimeType,
      });

      const url = new URL(
        `/n/${encodeURIComponent(this.namespace)}/b/${encodeURIComponent(this.bucket)}/o/${encodeURIComponent(key)}`,
        getPublicEndpoint(client.endpoint),
      ).toString();
      this.logger.log(`Uploaded ${key} (${buffer.length} bytes) to OCI Object Storage`);
      return { key, url, bucket: this.bucket };
    } catch (error) {
      this.logger.error(`OCI Object Storage upload failed for ${key}: ${errorMessage(error)}`);
      throw new InternalServerErrorException('File upload to OCI Object Storage failed');
    }
  }

  async getPresignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 3600) {
      throw new RangeError('Download URL expiry must be between 1 and 3600 seconds');
    }

    const cached = this.downloadUrls.get(key);
    if (cached && cached.expiresAt > Date.now() + 30_000) return cached.url;

    const request = this.downloadUrlRequests.get(key);
    if (request) return request;

    const pending = this.createDownloadUrl(key, expiresInSeconds);
    this.downloadUrlRequests.set(key, pending);
    try {
      return await pending;
    } finally {
      if (this.downloadUrlRequests.get(key) === pending) {
        this.downloadUrlRequests.delete(key);
      }
    }
  }

  private async createDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    try {
      const client = await this.getClient();
      const previous = this.downloadUrls.get(key);
      const response = await client.createPreauthenticatedRequest({
        namespaceName: this.namespace,
        bucketName: this.bucket,
        createPreauthenticatedRequestDetails: {
          name: `jobin-download-${uuid()}`,
          objectName: key,
          accessType:
            objectstorage.models.CreatePreauthenticatedRequestDetails.AccessType.ObjectRead,
          timeExpires: new Date(Date.now() + expiresInSeconds * 1000),
        },
      });
      const { id, accessUri } = response.preauthenticatedRequest;
      const url = new URL(accessUri, getPublicEndpoint(client.endpoint)).toString();
      this.downloadUrls.set(key, {
        id,
        url,
        expiresAt: Date.now() + expiresInSeconds * 1000,
      });

      if (previous) {
        try {
          await client.deletePreauthenticatedRequest({
            namespaceName: this.namespace,
            bucketName: this.bucket,
            parId: previous.id,
          });
        } catch (error) {
          this.logger.warn(
            `Could not revoke a previous OCI download URL for ${key}: ${errorMessage(error)}`,
          );
        }
      }

      return url;
    } catch (error) {
      this.logger.error(`Failed to generate OCI download URL for ${key}: ${errorMessage(error)}`);
      throw new InternalServerErrorException('Could not generate download URL');
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const { value } = await (
        await this.getClient()
      ).getObject({
        namespaceName: this.namespace,
        bucketName: this.bucket,
        objectName: key,
      });
      if (!value) throw new Error('OCI returned an empty object body');

      const chunks: Buffer[] = [];
      for await (const chunk of value) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`OCI Object Storage download failed for ${key}: ${errorMessage(error)}`);
      throw new InternalServerErrorException('Could not download file from OCI Object Storage');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await (
        await this.getClient()
      ).deleteObject({
        namespaceName: this.namespace,
        bucketName: this.bucket,
        objectName: key,
      });
      this.downloadUrls.delete(key);
      this.logger.log(`Deleted OCI Object Storage object: ${key}`);
    } catch (error) {
      this.logger.warn(`OCI Object Storage delete failed for ${key}: ${errorMessage(error)}`);
    }
  }

  async deleteFileOrThrow(key: string): Promise<void> {
    try {
      await (
        await this.getClient()
      ).deleteObject({
        namespaceName: this.namespace,
        bucketName: this.bucket,
        objectName: key,
      });
      this.downloadUrls.delete(key);
      this.logger.log(`Deleted OCI Object Storage object: ${key}`);
    } catch (error) {
      this.logger.error(`OCI Object Storage delete failed for ${key}: ${errorMessage(error)}`);
      throw new InternalServerErrorException('Could not delete stored file');
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await (
        await this.getClient()
      ).headObject({
        namespaceName: this.namespace,
        bucketName: this.bucket,
        objectName: key,
      });
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      this.logger.error(
        `OCI Object Storage existence check failed for ${key}: ${errorMessage(error)}`,
      );
      throw new InternalServerErrorException('Could not check stored file');
    }
  }
}
