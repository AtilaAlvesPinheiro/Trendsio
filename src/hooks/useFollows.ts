import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/**
 * Hook para gerenciar follows entre usuários
 * Fornece: verificação de follow, follow, unfollow
 */
export function useFollows(targetUserId: string) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Query: Verificar se o usuário segue
  const { data: isFollowing = false } = useQuery({
    queryKey: ['isFollowing', user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId || user.id === targetUserId) return false;

      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar follow:', error);
        throw error;
      }

      return !!data; // true se existe, false caso contrário
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
    staleTime: 1000, // Cache por 1 segundo
    refetchInterval: 2000, // Refetch a cada 2 segundos
  });

  // Query: Contar followers
  const { data: followersCount = 0 } = useQuery({
    queryKey: ['followersCount', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return 0;

      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      if (error) {
        console.error('Erro ao contar followers:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!targetUserId,
  });

  // Query: Contar seguindo
  const { data: followingCount = 0 } = useQuery({
    queryKey: ['followingCount', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return 0;

      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);

      if (error) {
        console.error('Erro ao contar seguindo:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!targetUserId,
  });

  // Mutation: Seguir usuário
  const followUser = useCallback(
    async (): Promise<boolean> => {
      if (!user) {
        toast.error('Você precisa estar autenticado');
        return false;
      }

      if (user.id === targetUserId) {
        toast.error('Você não pode seguir a si mesmo');
        return false;
      }

      setLoading(true);
      const toastId = toast.loading('Seguindo...');

      try {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });

        if (error) {
          console.error('Erro ao seguir:', error);
          toast.error('Erro ao seguir usuário', { id: toastId });
          return false;
        }

        toast.success('Seguindo! 🎉', { id: toastId });

        // Invalidar queries relacionadas
        await queryClient.invalidateQueries({
          queryKey: ['isFollowing', user.id, targetUserId],
        });
        await queryClient.invalidateQueries({
          queryKey: ['followersCount', targetUserId],
        });
        await queryClient.invalidateQueries({
          queryKey: ['followingCount', user.id],
        });

        return true;
      } catch (error: any) {
        console.error('Exceção ao seguir:', error);
        toast.error(error.message || 'Erro desconhecido', { id: toastId });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, targetUserId, queryClient]
  );

  // Mutation: Deixar de seguir
  const unfollowUser = useCallback(
    async (): Promise<boolean> => {
      if (!user) {
        toast.error('Você precisa estar autenticado');
        return false;
      }

      setLoading(true);
      const toastId = toast.loading('Deixando de seguir...');

      try {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) {
          console.error('Erro ao deixar de seguir:', error);
          toast.error('Erro ao deixar de seguir', { id: toastId });
          return false;
        }

        toast.success('Deixou de seguir', { id: toastId });

        // Invalidar queries relacionadas
        await queryClient.invalidateQueries({
          queryKey: ['isFollowing', user.id, targetUserId],
        });
        await queryClient.invalidateQueries({
          queryKey: ['followersCount', targetUserId],
        });
        await queryClient.invalidateQueries({
          queryKey: ['followingCount', user.id],
        });

        return true;
      } catch (error: any) {
        console.error('Exceção ao deixar de seguir:', error);
        toast.error(error.message || 'Erro desconhecido', { id: toastId });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, targetUserId, queryClient]
  );

  // Toggle follow
  const toggleFollow = useCallback(async () => {
    if (isFollowing) {
      return await unfollowUser();
    } else {
      return await followUser();
    }
  }, [isFollowing, followUser, unfollowUser]);

  return {
    isFollowing,
    followersCount,
    followingCount,
    followUser,
    unfollowUser,
    toggleFollow,
    loading,
  };
}
