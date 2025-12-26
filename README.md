# @fluxsave/sdk

JavaScript/TypeScript SDK for FluxSave. Supports API key + secret auth, file uploads, and file management.

## Install

```bash
npm install @fluxsave/sdk
# or
yarn add @fluxsave/sdk
```

## Usage

```ts
import { FluxsaveClient } from '@fluxsave/sdk';

const client = new FluxsaveClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'fs_xxx',
  apiSecret: 'sk_xxx',
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
  baseUrl: 'http://localhost:3000',
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

## Auth

Auth is sent as headers:

```
X-API-KEY: <apiKey>
X-API-SECRET: <apiSecret>
```

## License

MIT
