import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { OciObjectStorageClient } from './s3.service';
import { S3Service } from './s3.service';

class TestS3Service extends S3Service {
  constructor(
    config: ConfigService,
    private readonly client: OciObjectStorageClient,
  ) {
    super(config);
  }

  protected override async createClient(): Promise<OciObjectStorageClient> {
    return this.client;
  }
}

function createClient(): OciObjectStorageClient {
  return {
    endpoint: 'https://objectstorage.uk-london-1.{dualStack?ds.oci.:}oraclecloud.com',
    putObject: jest.fn().mockResolvedValue({}),
    createPreauthenticatedRequest: jest.fn().mockImplementation((request) =>
      Promise.resolve({
        opcClientRequestId: '',
        opcRequestId: '',
        preauthenticatedRequest: {
          id: 'par-id',
          name: request.createPreauthenticatedRequestDetails.name,
          accessUri: '/p/temporary-token/n/lrky3blu0nc9/b/jobin-resumes/o/resumes%2Ffile.pdf',
          accessType: request.createPreauthenticatedRequestDetails.accessType,
          timeExpires: request.createPreauthenticatedRequestDetails.timeExpires,
          timeCreated: new Date(),
        },
      }),
    ),
    deletePreauthenticatedRequest: jest.fn().mockResolvedValue({}),
    getObject: jest.fn().mockResolvedValue({ value: Readable.from([Buffer.from('resume')]) }),
    deleteObject: jest.fn().mockResolvedValue({}),
    headObject: jest.fn().mockResolvedValue({}),
  };
}

function createService(client = createClient()) {
  const config = new ConfigService({
    OCI_OBJECT_STORAGE_BUCKET: 'jobin-resumes',
    OCI_OBJECT_STORAGE_NAMESPACE: 'lrky3blu0nc9',
    OCI_REGION: 'uk-london-1',
  });
  return { client, service: new TestS3Service(config, client) };
}

describe('S3Service OCI Object Storage adapter', () => {
  it('uploads objects to the configured private bucket', async () => {
    const { client, service } = createService();
    const buffer = Buffer.from('resume');

    const result = await service.uploadFile(buffer, 'resume.pdf', 'application/pdf');

    expect(client.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        namespaceName: 'lrky3blu0nc9',
        bucketName: 'jobin-resumes',
        objectName: result.key,
        putObjectBody: buffer,
        contentLength: buffer.length,
        contentType: 'application/pdf',
      }),
    );
    expect(result.url).toMatch(/^https:\/\/objectstorage\.uk-london-1\.oraclecloud\.com\/n\//);
  });

  it('creates a short-lived read link for one object and reuses it', async () => {
    const { client, service } = createService();

    const [first, second] = await Promise.all([
      service.getPresignedUrl('resumes/file.pdf'),
      service.getPresignedUrl('resumes/file.pdf'),
    ]);

    expect(new URL(first).origin).toBe('https://objectstorage.uk-london-1.oraclecloud.com');
    expect(first).toContain('/p/temporary-token/');
    expect(second).toBe(first);
    expect(client.createPreauthenticatedRequest).toHaveBeenCalledTimes(1);
    expect(client.createPreauthenticatedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        namespaceName: 'lrky3blu0nc9',
        bucketName: 'jobin-resumes',
        createPreauthenticatedRequestDetails: expect.objectContaining({
          objectName: 'resumes/file.pdf',
          accessType: 'ObjectRead',
        }),
      }),
    );
  });

  it('downloads the object body as a buffer', async () => {
    const { service } = createService();

    await expect(service.downloadFile('resumes/file.pdf')).resolves.toEqual(Buffer.from('resume'));
  });

  it('returns false only when the object does not exist', async () => {
    const { client, service } = createService();
    jest.mocked(client.headObject).mockRejectedValueOnce({ statusCode: 404 });

    await expect(service.fileExists('resumes/missing.pdf')).resolves.toBe(false);

    jest.mocked(client.headObject).mockRejectedValueOnce({ statusCode: 403 });
    await expect(service.fileExists('resumes/file.pdf')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
