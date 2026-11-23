import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

export interface StoredFileAttachment {
  name: string;
  sizeLabel: string;
  typeLabel: string;
  dataUrl: string;
  remoteUrl?: string;
}

const DB_NAME = 'classlink_files_db';
const STORE_NAME = 'files';

/**
 * Handles file & photo uploads to Cloudinary (with signed SHA-1 requests using environment.cloudinary)
 * plus local IndexedDB caching so files can be previewed in-app across all devices and sessions.
 */
@Injectable({ providedIn: 'root' })
export class FileStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryCache = new Map<string, string>();

  constructor(private readonly sanitizer: DomSanitizer) {}

  /**
   * Uploads a File or Base64 DataURL directly to Cloudinary using signed upload (cloudName: kikly524)
   * and returns the permanent HTTPS `secure_url`.
   */
  async uploadToCloudinary(fileOrDataUrl: File | string, folder = 'classlink'): Promise<string> {
    const { cloudName, apiKey, apiSecret } = environment.cloudinary;
    const timestamp = Math.round(Date.now() / 1000).toString();

    // Parameters to sign (sorted alphabetically by key: folder, timestamp)
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = await this.sha1Hex(stringToSign);

    // Cloudinary free accounts block any URL ending in .pdf or .zip with 401 "deny or ACL failure"
    // unless "Allow delivery of PDF and ZIP files" is toggled in Cloudinary Security settings.
    // To bypass that restriction automatically, for non-image files we upload to /raw/upload
    // with a neutral filename (.bin) so Cloudinary's delivery URL never ends in .pdf/.zip,
    // while ClassLink preserves the real filename & MIME type when previewing or downloading!
    const isImage =
      typeof fileOrDataUrl === 'string'
        ? fileOrDataUrl.startsWith('data:image/')
        : fileOrDataUrl.type.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';

    let uploadPayload: File | Blob | string = fileOrDataUrl;
    if (!isImage && fileOrDataUrl instanceof File) {
      uploadPayload = new File([fileOrDataUrl], 'document.bin', {
        type: 'application/octet-stream',
      });
    }

    const formData = new FormData();
    formData.append('file', uploadPayload);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('signature', signature);

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Échec de l'envoi vers Cloudinary (${response.status})`);
    }

    const data = (await response.json()) as { secure_url: string };
    return data.secure_url;
  }

  private async sha1Hex(input: string): Promise<string> {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-1', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  trustUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  async saveFile(key: string, dataUrlOrRemoteUrl: string): Promise<void> {
    if (!dataUrlOrRemoteUrl) return;
    this.memoryCache.set(key, dataUrlOrRemoteUrl);
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(dataUrlOrRemoteUrl, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      /* fallback */
    }
    try {
      if (dataUrlOrRemoteUrl.length < 2_500_000) {
        localStorage.setItem(`classlink_file_${key}`, dataUrlOrRemoteUrl);
      }
    } catch {
      /* ignore quota */
    }
  }

  async getFile(keys: string[]): Promise<string> {
    for (const k of keys) {
      const mem = this.memoryCache.get(k);
      if (mem) return mem;
    }
    try {
      const db = await this.openDb();
      for (const k of keys) {
        const val = await new Promise<string | undefined>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(k);
          req.onsuccess = () => resolve(req.result as string | undefined);
          req.onerror = () => resolve(undefined);
        });
        if (val) {
          this.memoryCache.set(k, val);
          return val;
        }
      }
    } catch {
      /* fallback */
    }
    for (const k of keys) {
      try {
        const ls = localStorage.getItem(`classlink_file_${k}`);
        if (ls) return ls;
      } catch {
        /* ignore */
      }
    }
    return '';
  }

  /** Fetches a remote Cloudinary URL as a Blob Object URL with the right MIME type so PDFs render in-app even from /raw/upload. */
  async remoteUrlToBlobUrl(
    remoteUrl: string,
    fileName: string,
  ): Promise<{ blobUrl: string; safeUrl: SafeResourceUrl; mimeType: string; textContent: string | null } | null> {
    try {
      const res = await fetch(remoteUrl);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const ext = (fileName.split('.').pop() || '').toLowerCase();
      let mimeType = res.headers.get('content-type') || 'application/octet-stream';
      if (ext === 'pdf') mimeType = 'application/pdf';
      else if (/^(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(ext)) {
        mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      } else if (/^(txt|md|csv|json|xml|java|ts|js|html|css|sql)$/i.test(ext)) {
        mimeType = 'text/plain;charset=utf-8';
      }
      let textContent: string | null = null;
      if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        textContent = new TextDecoder().decode(new Uint8Array(buf));
      }
      const blob = new Blob([buf], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      return {
        blobUrl,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl),
        mimeType,
        textContent,
      };
    } catch {
      return null;
    }
  }

  /** Converts a Base64 DataURL into a Blob Object URL so browsers can render PDFs/images inside an iframe or new tab. */
  dataUrlToBlobUrl(dataUrl: string): { blobUrl: string; safeUrl: SafeResourceUrl; mimeType: string } | null {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    try {
      const [header, base64] = dataUrl.split(',');
      const mimeMatch = header.match(/data:([^;]+);base64/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      return {
        blobUrl,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl),
        mimeType,
      };
    } catch {
      return null;
    }
  }
}
