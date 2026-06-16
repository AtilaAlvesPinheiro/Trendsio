import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function useLikes(postId: string, initialLikesCount: number = 0) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar contagem real de likes do post
  const fetchLikesCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (error) throw error;
      setLikesCount(count || 0);
      return count || 0;
    } catch (error) {
      console.error('Erro ao buscar contagem de likes:', error);
      return initialLikesCount;
    }
  }, [postId, initialLikesCount]);

  // Carregar estado inicial: se o usuário curtiu este post
  const checkIfLiked = useCallback(async () => {
    if (!user || !postId) return false;

    try {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      const liked = !!data;
      setIsLiked(liked);
      return liked;
    } catch (error) {
      // Erro 406 = nenhuma linha encontrada, o que é esperado
      setIsLiked(false);
      return false;
    }
  }, [user, postId]);

  // Toggle like: se curtiu, remove; se não curtiu, adiciona
  const toggleLike = useCallback(async () => {
    if (!user) {
      toast.error('Você precisa estar autenticado');
      return false;
    }

    setLoading(true);
    const previousLiked = isLiked;
    const previousCount = likesCount;

    try {
      if (isLiked) {
        // Delete like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Insert like
        const { error } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        if (error) throw error;
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }

      // Refetch contagem real de likes após 200ms
      setTimeout(() => {
        fetchLikesCount();
      }, 200);

      // Invalidar e refetch queries relacionadas
      await queryClient.invalidateQueries({
        queryKey: ['posts'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['communityPosts'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['userPosts'],
      });

      return true;
    } catch (error: any) {
      console.error('Erro ao fazer like:', error);
      // Reverter estado em caso de erro
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      toast.error('Erro ao processar like');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, postId, isLiked, likesCount, queryClient, fetchLikesCount]);

  // Setup real-time subscription para sincronizar likes
  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`likes-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          // Quando qualquer like é inserido/deletado neste post, refetch a contagem
          fetchLikesCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, fetchLikesCount]);

  return {
    likesCount,
    isLiked,
    toggleLike,
    loading,
    checkIfLiked,
    fetchLikesCount,
  };
}
