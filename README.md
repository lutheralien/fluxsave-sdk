# @fluxsave/sdk

JavaScript/TypeScript SDK for FluxSave. Supports API key + secret auth, file uploads, and file management.

## Install

```bash
npm install @fluxsave/sdk
```

## Documentation

https://fluxsave-sdk-docs.vercel.app/

## Usage

```ts
import { FluxsaveClient } from '@fluxsave/sdk';

const client = new FluxsaveClient({
  baseUrl: 'https://fluxsaveapi.lutheralien.com',
  apiKey: 'fs_xxx',
  apiSecret: 'sk_xxx',
  timeoutMs: 30000,
  retry: { retries: 2, retryDelayMs: 400 },
});

const file = new File([blobData], 'photo.png', { type: 'image/png' });
const uploaded = await client.uploadFile(file, { name: 'marketing-hero', transform: true });

const files = await client.listFiles();
await client.deleteFile(uploaded.data.fileId || uploaded.data._id);
```

## Node example

```ts
import { FluxsaveClient } from '@fluxsave/sdk';
import { readFile } from 'node:fs/promises';

const client = new FluxsaveClient({
  baseUrl: 'https://fluxsaveapi.lutheralien.com',
  apiKey: process.env.FLUXSAVE_KEY!,
  apiSecret: process.env.FLUXSAVE_SECRET!,
});

const buffer = await readFile('./photo.png');
const file = new Blob([buffer], { type: 'image/png' });
const response = await client.uploadFile(file, { filename: 'photo.png' });
```

## API

- `uploadFile(file, options)`
- `uploadFiles(files, options)`
- `listFiles()`
- `getFileMetadata(fileId)`
- `updateFile(fileId, file, options)`
- `deleteFile(fileId)`
- `getMetrics()`
- `buildFileUrl(fileId, options)`
- `setTimeout(timeoutMs)`
- `setRetry(options)`
- `fileFromBuffer(buffer, filename, type?)`

## Auth

Auth is sent as headers:

```
X-API-KEY: <apiKey>
X-API-SECRET: <apiSecret>
```

## License

MIT
