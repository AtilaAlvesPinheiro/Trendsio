/**
 * Storage Utility Functions
 * Handles file uploads to Supabase Storage buckets with RLS compliance
 */

import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

export type StorageBucket = 'avatars' | 'community-covers' | 'post-media';

interface UploadOptions {
  bucket: StorageBucket;
  file: File;
  userId: string;
  customPath?: string; // e.g., "community-id/filename" for community-covers
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  success: boolean;
  publicUrl?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage and return the public URL
 * 
 * RLS Compliance:
 * - avatars: {bucket}//{user-id}/filename
 * - community-covers: {bucket}//{community-id}/filename
 * - post-media: {bucket}//{user-id}/filename
 */
export async function uploadFileToStorage(options: UploadOptions): Promise<UploadResult> {
  const { bucket, file, userId, customPath, onProgress } = options;

  try {
    // Validate file
    if (!file || file.size === 0) {
      return { success: false, error: 'Arquivo vazio ou inválido' };
    }

    // Generate unique filename (prevents overwrites)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${randomStr}_${sanitizedFileName}`;

    // Build path based on bucket type
    let filePath: string;
    if (customPath) {
      filePath = `${customPath}/${uniqueFileName}`;
    } else {
      // Default pattern: bucket/{user-id}/filename
      filePath = `${userId}/${uniqueFileName}`;
    }

    // Upload file to storage
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error(`Upload error to ${bucket}:`, uploadError);
      return { success: false, error: `Erro ao fazer upload: ${uploadError.message}` };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    if (!publicUrlData?.publicUrl) {
      return { success: false, error: 'Não foi possível gerar URL pública' };
    }

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      path: data.path,
    };
  } catch (error: any) {
    console.error('Storage upload exception:', error);
    return { success: false, error: error.message || 'Erro desconhecido no upload' };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFileFromStorage(
  bucket: StorageBucket,
  filePath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }
    return true;
  } catch (error: any) {
    console.error('Delete exception:', error);
    return false;
  }
}

/**
 * Get public URL for an existing file
 */
export function getPublicUrl(bucket: StorageBucket, filePath: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data?.publicUrl || '';
}

/**
 * Validate if file type is allowed for a bucket
 */
export function isValidFileForBucket(file: File, bucket: StorageBucket): boolean {
  const allowedMimes: Record<StorageBucket, string[]> = {
    avatars: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    'community-covers': ['image/jpeg', 'image/png', 'image/webp'],
    'post-media': [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
    ],
  };

  const maxSizes: Record<StorageBucket, number> = {
    avatars: 5 * 1024 * 1024, // 5MB
    'community-covers': 10 * 1024 * 1024, // 10MB
    'post-media': 50 * 1024 * 1024, // 50MB
  };

  const allowed = allowedMimes[bucket];
  const maxSize = maxSizes[bucket];

  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024));
    toast.error(`Arquivo muito grande. Máximo: ${sizeMB}MB`);
    return false;
  }

  if (!allowed.includes(file.type)) {
    toast.error(`Tipo de arquivo não permitido para este bucket`);
    return false;
  }

  return true;
}

/**
 * Validate if URL is valid (for external media links)
 */
export function isValidMediaUrl(url: string, type: 'image' | 'video_url'): boolean {
  try {
    const urlObj = new URL(url);

    if (type === 'image') {
      // Image URL should end with common image extensions or be from known image services
      const validImageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
      const imageServices = ['imgur.com', 'unsplash.com', 'pexels.com', 'pixabay.com'];

      const hasValidExt = validImageExtensions.some((ext) => url.toLowerCase().endsWith(ext));
      const isFromImageService = imageServices.some((service) => urlObj.hostname.includes(service));

      return hasValidExt || isFromImageService;
    }

    if (type === 'video_url') {
      // Video URL should be from known video services
      const videoServices = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'];
      return videoServices.some((service) => urlObj.hostname.includes(service));
    }

    return false;
  } catch {
    return false;
  }
}
