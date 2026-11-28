import { inject, Injectable } from '@angular/core';
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
 * Storage strategy:
 * - Photos (image/*): saved in IndexedDB and stored in Firebase as Base64 DataURL (data:image/...;base64,...).
 * - Other files (PDF, ZIP, docs, etc.): uploaded to Cloudinary (signed SHA-1 upload) and cached in IndexedDB.
 */
@Injectable({ providedIn: 'root' })
export class FileStorageService {
  private readonly sanitizer = inject(DomSanitizer);
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly memoryCache = new Map<string, string>();

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);
  }

  /**
   * Reads an image File as a Base64 DataURL (data:image/...;base64,...), resizing large images
   * so they fit cleanly in Firebase Realtime Database and IndexedDB.
   */
  async readImageAsBase64(file: File, maxDimension = 1024): Promise<string> {
    const rawDataUrl = await this.readFileAsDataUrl(file);
    if (!rawDataUrl.startsWith('data:image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
      return rawDataUrl;
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
        if (ratio === 1 && rawDataUrl.length < 700_000) {
          resolve(rawDataUrl);
          return;
        }
        const width = Math.max(1, Math.round(img.width * ratio));
        const height = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outputType = file.type === 'image/png' && rawDataUrl.length < 500_000 ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outputType, 0.85));
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    });
  }

  /**
   * Prepares any uploaded file according to its type:
   * - Photo -> Base64 DataURL saved in IndexedDB and returned for Firebase storage.
   * - Other file -> Uploaded to Cloudinary and cached in IndexedDB.
   */
  async prepareAttachment(file: File, cloudinaryFolder = 'classlink'): Promise<StoredFileAttachment> {
    const sizeLabel =
      file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
        : `${Math.max(1, Math.round(file.size / 1024))} Ko`;
    const typeLabel = (file.name.split('.').pop() || 'FICHIER').toUpperCase();

    if (this.isImageFile(file)) {
      const dataUrl = await this.readImageAsBase64(file);
      await this.saveFile(file.name, dataUrl);
      return {
        name: file.name,
        sizeLabel,
        typeLabel,
        dataUrl,
        remoteUrl: dataUrl,
      };
    }

    const [dataUrl, remoteUrl] = await Promise.all([
      this.readFileAsDataUrl(file),
      this.uploadToCloudinary(file, cloudinaryFolder),
    ]);
    if (dataUrl) {
      await this.saveFile(file.name, dataUrl);
    }
    return {
      name: file.name,
      sizeLabel,
      typeLabel,
      dataUrl,
      remoteUrl,
    };
  }

  /**
   * Uploads a non-image File directly to Cloudinary using signed upload in its original file type
   * and returns the permanent HTTPS `secure_url`.
   */
  async uploadToCloudinary(file: File, folder = 'classlink'): Promise<string> {
    const { cloudName, apiKey, apiSecret } = environment.cloudinary;
    const timestamp = Math.round(Date.now() / 1000).toString();
    const signature = await this.sha1Hex(`folder=${folder}&timestamp=${timestamp}${apiSecret}`);

    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
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

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  private async sha1Hex(input: string): Promise<string> {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-1', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
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
      /* IndexedDB unavailable */
    }
  }

  async removeFile(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      /* IndexedDB unavailable */
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
      /* IndexedDB unavailable */
    }
    return '';
  }

  /** Fetches a remote Cloudinary URL as a Blob Object URL with the right MIME type so PDFs render in-app. */
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
