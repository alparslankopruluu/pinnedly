import { Platform } from 'react-native';
import { getFirebaseWebApp } from '@/lib/firebaseApp';

declare const require: <T = unknown>(moduleName: string) => T;

type UploadBookmarkImageInput = {
  ownerId: string;
  bookmarkId: string;
  attachmentId: string;
  localUri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export type StoredImage = {
  url: string;
  storagePath: string;
};

function storageExtension(fileName?: string | null, mimeType?: string | null): string {
  const fileExtension = fileName?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fileExtension && fileExtension.length <= 5) return fileExtension;

  const mimeExtension = mimeType?.split('/').pop()?.toLowerCase().replace('jpeg', 'jpg');
  if (mimeExtension && /^[a-z0-9]{2,5}$/.test(mimeExtension)) return mimeExtension;
  return 'jpg';
}

export async function uploadBookmarkImage({
  ownerId,
  bookmarkId,
  attachmentId,
  localUri,
  fileName,
  mimeType,
}: UploadBookmarkImageInput): Promise<StoredImage> {
  const extension = storageExtension(fileName, mimeType);
  const storagePath = `users/${ownerId}/bookmarks/${bookmarkId}/${attachmentId}.${extension}`;

  if (Platform.OS === 'web') {
    const storage = require<typeof import('firebase/storage')>('firebase/storage');
    const response = await fetch(localUri);
    const blob = await response.blob();
    const storageRef = storage.ref(
      storage.getStorage(getFirebaseWebApp() as never),
      storagePath
    );
    await storage.uploadBytes(storageRef, blob, {
      contentType: mimeType || blob.type || 'image/jpeg',
    });
    return {
      storagePath,
      url: await storage.getDownloadURL(storageRef),
    };
  }

  const storage = require<typeof import('@react-native-firebase/storage')>(
    '@react-native-firebase/storage'
  );
  const storageRef = storage.ref(storage.getStorage(), storagePath);
  const nativePath = decodeURI(localUri).replace(/^file:\/\//, '');
  await storage.putFile(storageRef, nativePath, {
    contentType: mimeType || 'image/jpeg',
  });
  return {
    storagePath,
    url: await storage.getDownloadURL(storageRef),
  };
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  if (!storagePath) return;

  if (Platform.OS === 'web') {
    const storage = require<typeof import('firebase/storage')>('firebase/storage');
    const storageRef = storage.ref(
      storage.getStorage(getFirebaseWebApp() as never),
      storagePath
    );
    await storage.deleteObject(storageRef);
    return;
  }

  const storage = require<typeof import('@react-native-firebase/storage')>(
    '@react-native-firebase/storage'
  );
  await storage.deleteObject(storage.ref(storage.getStorage(), storagePath));
}
