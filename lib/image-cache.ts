'use client';

interface CachedImage {
  url: string;
  blob: Blob;
  storeId: string;
  size: number;
  mimeType: string;
  lastAccessed: number;
  cachedAt: number;
}

class ImageCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly DB_NAME = 'dive_pos_images';
  private readonly STORE_NAME = 'images';
  private readonly VERSION = 1;
  private readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, {
            keyPath: 'url',
          });
          store.createIndex('storeId', 'storeId', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          store.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async getImage(url: string): Promise<Blob | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => {
        if (request.result) {
          // Update last accessed timestamp asynchronously
          this.updateLastAccessed(url);
          resolve(request.result.blob);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('Failed to get image from cache:', request.error);
        resolve(null);
      };
    });
  }

  async cacheImage(
    url: string,
    blob: Blob,
    metadata: { storeId?: string } = {},
  ): Promise<void> {
    await this.init();
    if (!this.db) return;

    const cachedImage: CachedImage = {
      url,
      blob,
      storeId: metadata.storeId || 'unknown',
      size: blob.size,
      mimeType: blob.type,
      lastAccessed: Date.now(),
      cachedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.put(cachedImage);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to cache image:', request.error);
        reject(request.error);
      };
    });
  }

  private async updateLastAccessed(url: string): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    const getRequest = store.get(url);

    getRequest.onsuccess = () => {
      if (getRequest.result) {
        const updated = {
          ...getRequest.result,
          lastAccessed: Date.now(),
        };
        store.put(updated);
      }
    };
  }

  async prefetchImages(
    urls: string[],
    storeId: string,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    const CONCURRENT = 5; // Fetch 5 images at once
    let loaded = 0;

    for (let i = 0; i < urls.length; i += CONCURRENT) {
      const batch = urls.slice(i, i + CONCURRENT);

      await Promise.all(
        batch.map(async (url) => {
          try {
            // Check if already cached
            const cached = await this.getImage(url);
            if (!cached) {
              const response = await fetch(url);
              const blob = await response.blob();
              await this.cacheImage(url, blob, { storeId });
            }
            loaded++;
            onProgress?.(loaded, urls.length);
          } catch (error) {
            console.error(`Failed to prefetch ${url}:`, error);
            loaded++;
            onProgress?.(loaded, urls.length);
          }
        }),
      );
    }
  }

  async clearOldCache(maxAge: number = this.MAX_CACHE_AGE): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    const cutoff = Date.now() - maxAge;
    let deletedCount = 0;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index('lastAccessed');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      tx.oncomplete = () => {
        console.log(`Cleared ${deletedCount} old images from cache`);
        resolve(deletedCount);
      };
    });
  }

  async getStorageUsage(): Promise<{
    totalBytes: number;
    imageCount: number;
  }> {
    await this.init();
    if (!this.db)
      return {
        totalBytes: 0,
        imageCount: 0,
      };

    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const images: CachedImage[] = request.result;
        const totalBytes = images.reduce((sum, img) => sum + img.size, 0);
        resolve({
          totalBytes,
          imageCount: images.length,
        });
      };

      request.onerror = () => {
        resolve({ totalBytes: 0, imageCount: 0 });
      };
    });
  }

  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All cached images cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear cache:', request.error);
        reject(request.error);
      };
    });
  }

  async getImagesByStore(storeId: string): Promise<string[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index('storeId');
      const request = index.getAll(storeId);

      request.onsuccess = () => {
        const urls = request.result.map((img: CachedImage) => img.url);
        resolve(urls);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  }
}

export const imageCache = new ImageCacheService();
