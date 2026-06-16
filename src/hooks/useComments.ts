import { useState, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/**
 * Hook para gerenciar comentários de posts
 * Fornece: listar comentários, adicionar comentário, deletar comentário
 */
export function useComments(postId: string) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Query: Listar comentários do post
  const { 
    data: comments = [], 
    isLoading: commentsLoading, 
    error: commentsError,
    refetch: refetchComments 
  } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, user_id, created_at, profiles(username, avatar_url, full_name)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar comentários:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!postId,
    staleTime: 5000, // Cache por 5 segundos
  });

  // Mutation: Adicionar comentário
  const addCommentMutation = useMutation({
    mutationFn: async (content: string): Promise<any> => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      if (!content.trim()) {
        throw new Error('Comentário não pode estar vazio');
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar comentário:', error);
        throw error;
      }

      return data;
    },
    onSuccess: async (newComment) => {
      // Invalidar e refetch imediato
      await queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      await queryClient.refetchQueries({ queryKey: ['comments', postId] });
      
      // Invalidar contagem de posts para atualizar comments_count
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      
      toast.success('Comentário adicionado! 💬', { duration: 1500 });
    },
    onError: (error: any) => {
      console.error('Erro ao postar comentário:', error);
      toast.error(error.message || 'Erro ao adicionar comentário');
    },
  });

  // Mutation: Deletar comentário
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string): Promise<void> => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id); // Apenas o autor pode deletar

      if (error) {
        console.error('Erro ao deletar comentário:', error);
        throw error;
      }
    },
    onSuccess: async () => {
      // Invalidar e refetch imediato
      await queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      await queryClient.refetchQueries({ queryKey: ['comments', postId] });
      
      // Invalidar contagem de posts
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      
      toast.success('Comentário removido', { duration: 1500 });
    },
    onError: (error: any) => {
      console.error('Erro ao deletar comentário:', error);
      toast.error(error.message || 'Erro ao remover comentário');
    },
  });

  return {
    comments,
    commentsLoading,
    commentsError,
    refetchComments,
    addComment: addCommentMutation.mutate,
    addingComment: addCommentMutation.isPending,
    deleteComment: deleteCommentMutation.mutate,
    deletingCommentId: deleteCommentMutation.variables as string | undefined,
  };
}
