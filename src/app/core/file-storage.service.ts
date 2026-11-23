import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface StoredFileAttachment {
  name: string;
  sizeLabel: string;
  typeLabel: string;
  dataUrl: string;
}

const DB_NAME = 'classlink_files_db';
const STORE_NAME = 'files';

/** Stores uploaded file DataURLs in IndexedDB (supports large PDFs/images beyond localStorage 5MB limit) with localStorage fallback. */
@Injectable({ providedIn: 'root' })
export class FileStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryCache = new Map<string, string>();

  constructor(private readonly sanitizer: DomSanitizer) {}

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

  async saveFile(key: string, dataUrl: string): Promise<void> {
    if (!dataUrl) return;
    this.memoryCache.set(key, dataUrl);
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(dataUrl, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      /* fallback to localStorage if small enough */
    }
    try {
      if (dataUrl.length < 2_500_000) {
        localStorage.setItem(`classlink_file_${key}`, dataUrl);
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
