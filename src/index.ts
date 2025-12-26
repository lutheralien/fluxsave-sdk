export type ApiSuccess<T> = {
  status: number;
  message: string;
  data: T;
};

export type ApiError = {
  status: number;
  message: string;
  data?: unknown;
};

export type FileRecord = {
  _id?: string;
  fileId?: string;
  cloudId?: string;
  filename: string;
  originalFilename?: string;
  url: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Metrics = {
  totalFiles: number;
  totalStorageBytes: number;
  averageFileSize: number;
  storageLimitBytes: number;
  storageRemainingBytes: number;
  storageUsedPercent: number;
  uploadsLast7Days: number;
  latestUploadAt?: string | null;
  byMimeType: Record<string, number>;
};

export type FetchLike = typeof fetch;

export type RetryOptions = {
  retries: number;
  retryDelayMs?: number;
  retryOn?: number[];
};

export type FluxsaveClientOptions = {
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  retry?: RetryOptions;
};

export type UploadOptions = {
  name?: string;
  transform?: boolean;
  filename?: string;
};

export type TransformOptions = {
  width?: number;
  height?: number;
  format?: string;
  quality?: number | string;
};

export class FluxsaveError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'FluxsaveError';
    this.status = status;
    this.data = data;
  }
}

export class FluxsaveClient {
  private baseUrl: string;
  private apiKey?: string;
  private apiSecret?: string;
  private fetchImpl: FetchLike;
  private timeoutMs: number;
  private retry: Required<RetryOptions>;

  constructor(options: FluxsaveClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.retry = {
      retries: options.retry?.retries ?? 2,
      retryDelayMs: options.retry?.retryDelayMs ?? 400,
      retryOn: options.retry?.retryOn ?? [429, 500, 502, 503, 504],
    };
  }

  setAuth(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  setTimeout(timeoutMs: number) {
    this.timeoutMs = timeoutMs;
  }

  setRetry(options: RetryOptions) {
    this.retry = {
      retries: options.retries,
      retryDelayMs: options.retryDelayMs ?? this.retry.retryDelayMs,
      retryOn: options.retryOn ?? this.retry.retryOn,
    };
  }

  async uploadFile(file: Blob, options: UploadOptions = {}): Promise<ApiSuccess<FileRecord>> {
    const form = new FormData();
    form.append('file', file, options.filename || 'file');
    if (options.name) {
      form.append('name', options.name);
    }
    if (options.transform !== undefined) {
      form.append('transform', String(options.transform));
    }

    return this.request<ApiSuccess<FileRecord>>('/api/v1/files/upload', {
      method: 'POST',
      body: form,
    });
  }

  async uploadFiles(
    files: Array<{ file: Blob; filename?: string }>,
    options: UploadOptions = {}
  ): Promise<ApiSuccess<FileRecord[]>> {
    const form = new FormData();
    files.forEach((item) => {
      form.append('files', item.file, item.filename || 'file');
    });
    if (options.name) {
      form.append('name', options.name);
    }
    if (options.transform !== undefined) {
      form.append('transform', String(options.transform));
    }

    return this.request<ApiSuccess<FileRecord[]>>('/api/v1/files/upload', {
      method: 'POST',
      body: form,
    });
  }

  async listFiles(): Promise<ApiSuccess<FileRecord[]>> {
    return this.request<ApiSuccess<FileRecord[]>>('/api/v1/files', {
      method: 'GET',
    });
  }

  async getFileMetadata(fileId: string): Promise<ApiSuccess<FileRecord>> {
    return this.request<ApiSuccess<FileRecord>>(`/api/v1/files/metadata/${fileId}`, {
      method: 'GET',
    });
  }

  async updateFile(fileId: string, file: Blob, options: UploadOptions = {}): Promise<ApiSuccess<FileRecord>> {
    const form = new FormData();
    form.append('file', file, options.filename || 'file');
    if (options.name) {
      form.append('name', options.name);
    }
    if (options.transform !== undefined) {
      form.append('transform', String(options.transform));
    }

    return this.request<ApiSuccess<FileRecord>>(`/api/v1/files/${fileId}`, {
      method: 'PUT',
      body: form,
    });
  }

  async deleteFile(fileId: string): Promise<ApiSuccess<null>> {
    return this.request<ApiSuccess<null>>(`/api/v1/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  async getMetrics(): Promise<ApiSuccess<Metrics>> {
    return this.request<ApiSuccess<Metrics>>('/api/v1/metrics', {
      method: 'GET',
    });
  }

  buildFileUrl(fileId: string, options: TransformOptions = {}) {
    const url = new URL(`${this.baseUrl}/api/v1/files/${fileId}`);
    if (options.width) url.searchParams.set('width', String(options.width));
    if (options.height) url.searchParams.set('height', String(options.height));
    if (options.format) url.searchParams.set('format', options.format);
    if (options.quality !== undefined) url.searchParams.set('quality', String(options.quality));
    return url.toString();
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    if (!this.apiKey || !this.apiSecret) {
      throw new FluxsaveError('API key and secret are required', 401);
    }

    const headers = new Headers(init.headers || {});
    headers.set('x-api-key', this.apiKey);
    headers.set('x-api-secret', this.apiSecret);

    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          ...init,
          headers,
          signal: controller.signal,
        });

        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const payload = isJson ? await response.json() : await response.text();

        if (!response.ok) {
          const message = (payload && (payload.message || payload.error)) || response.statusText;
          const error = new FluxsaveError(message, response.status, payload);
          if (this.shouldRetry(response.status, attempt)) {
            attempt += 1;
            await this.sleep(this.retry.retryDelayMs);
            continue;
          }
          throw error;
        }

        return payload as T;
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          if (this.shouldRetry(0, attempt)) {
            attempt += 1;
            await this.sleep(this.retry.retryDelayMs);
            continue;
          }
          throw new FluxsaveError('Request timed out', 408);
        }

        if (this.shouldRetry(0, attempt)) {
          attempt += 1;
          await this.sleep(this.retry.retryDelayMs);
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  private shouldRetry(status: number, attempt: number) {
    if (attempt >= this.retry.retries) {
      return false;
    }
    if (status === 0) {
      return true;
    }
    return this.retry.retryOn.includes(status);
  }

  private async sleep(delayMs: number) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

const toArrayBuffer = (buffer: ArrayBuffer | Uint8Array) => {
  if (buffer instanceof Uint8Array) {
    const copy = new Uint8Array(buffer.byteLength);
    copy.set(buffer);
    return copy.buffer;
  }
  return buffer;
};

export const fileFromBuffer = (
  buffer: ArrayBuffer | Uint8Array,
  filename: string,
  type = 'application/octet-stream'
) => {
  const data = toArrayBuffer(buffer);
  return new Blob([data], { type });
};
