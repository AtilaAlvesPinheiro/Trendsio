/**
 * useStorageUpload Hook
 * Encapsula lógica de upload para diferentes buckets de forma reutilizável
 */

import { useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { uploadFileToStorage, StorageBucket, isValidFileForBucket } from '../lib/storage';
import toast from 'react-hot-toast';

interface UseStorageUploadOptions {
  bucket: StorageBucket;
  userId: string;
  customPath?: string; // e.g., "community-id" for community-covers
}

export function useStorageUpload(options: UseStorageUploadOptions) {
  const { bucket, userId, customPath } = options;
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(
    async (file: File): Promise<{ success: boolean; publicUrl?: string; error?: string }> => {
      // Validate file
      if (!isValidFileForBucket(file, bucket)) {
        return { success: false, error: 'Arquivo não permitido para este bucket' };
      }

      setLoading(true);
      setProgress(0);

      try {
        const result = await uploadFileToStorage({
          bucket,
          file,
          userId,
          customPath,
          onProgress: setProgress,
        });

        if (!result.success) {
          return { success: false, error: result.error };
        }

        setProgress(100);
        return { success: true, publicUrl: result.publicUrl };
      } catch (error: any) {
        console.error('Upload error:', error);
        return { success: false, error: error.message || 'Erro no upload' };
      } finally {
        setLoading(false);
      }
    },
    [bucket, userId, customPath]
  );

  const reset = useCallback(() => {
    setProgress(0);
    setLoading(false);
  }, []);

  return { upload, loading, progress, reset };
}

/**
 * Hook para atualizar foto de perfil
 */
export function useUpdateAvatar(userId: string) {
  const { upload, loading, progress } = useStorageUpload({
    bucket: 'avatars',
    userId,
  });

  const updateAvatar = useCallback(
    async (file: File): Promise<boolean> => {
      const uploadResult = await upload(file);

      if (!uploadResult.success) {
        toast.error(uploadResult.error || 'Erro ao fazer upload de avatar');
        return false;
      }

      try {
        const toastId = toast.loading('Salvando foto...');
        
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: uploadResult.publicUrl })
          .eq('id', userId);

        if (error) {
          toast.error('Erro ao atualizar perfil', { id: toastId });
          return false;
        }

        toast.success('Foto de perfil atualizada! 📸', { id: toastId });
        return true;
      } catch (error: any) {
        toast.error(error.message || 'Erro ao atualizar perfil');
        return false;
      }
    },
    [upload, userId]
  );

  return { updateAvatar, loading, progress };
}

/**
 * Hook para atualizar capa de comunidade
 */
export function useUpdateCommunityCover(communityId: string, userId: string) {
  const { upload, loading, progress } = useStorageUpload({
    bucket: 'community-covers',
    userId,
    customPath: communityId, // Pattern: community-covers/{community-id}/filename
  });

  const updateCover = useCallback(
    async (file: File): Promise<boolean> => {
      const uploadResult = await upload(file);

      if (!uploadResult.success) {
        toast.error(uploadResult.error || 'Erro ao fazer upload de capa');
        return false;
      }

      try {
        const toastId = toast.loading('Salvando capa...');
        
        const { error } = await supabase
          .from('communities')
          .update({ cover_url: uploadResult.publicUrl })
          .eq('id', communityId);

        if (error) {
          toast.error('Erro ao atualizar comunidade', { id: toastId });
          return false;
        }

        toast.success('Capa da comunidade atualizada! 🎨', { id: toastId });
        return true;
      } catch (error: any) {
        toast.error(error.message || 'Erro ao atualizar comunidade');
        return false;
      }
    },
    [upload, communityId]
  );

  return { updateCover, loading, progress };
}
