import { useCallback, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/**
 * Hook para gerenciar membership de comunidades
 * Fornece: verificação de membro, join, leave e invalidação de cache
 */
export function useCommunityMembership(communityId: string, isOwner: boolean = false) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Query: Verificar se o usuário é membro
  const { data: isMember = false, refetch: refetchMembership } = useQuery({
    queryKey: ['communityMember', communityId, user?.id],
    queryFn: async () => {
      if (!user || !communityId) return false;

      const { data, error } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar membro:', error);
        throw error;
      }

      return !!data; // true se existe, false caso contrário
    },
    enabled: !!user && !!communityId,
    staleTime: 1000, // Cache por 1 segundo
    refetchInterval: 2000, // Refetch a cada 2 segundos
  });

  // Mutation: Entrar na comunidade
  const joinCommunity = useCallback(
    async (): Promise<boolean> => {
      if (!user) {
        toast.error('Você precisa estar autenticado');
        return false;
      }

      setLoading(true);
      const toastId = toast.loading('Entrando na comunidade...');

      try {
        const { error } = await supabase
          .from('community_members')
          .insert({
            community_id: communityId,
            user_id: user.id,
            role: 'member',
          });

        if (error) {
          console.error('Erro ao entrar na comunidade:', error);
          toast.error('Erro ao entrar na comunidade', { id: toastId });
          return false;
        }

        toast.success('Bem-vindo à comunidade! 🎉', { id: toastId });

        // Invalidar queries relacionadas e refetch imediato
        await queryClient.invalidateQueries({
          queryKey: ['communityMember', communityId],
        });
        await queryClient.refetchQueries({
          queryKey: ['communityMember', communityId, user.id],
        });
        await queryClient.invalidateQueries({
          queryKey: ['community', communityId],
        });
        await queryClient.invalidateQueries({
          queryKey: ['userCommunities', user.id],
        });

        return true;
      } catch (error: any) {
        console.error('Exceção ao entrar na comunidade:', error);
        toast.error(error.message || 'Erro desconhecido', { id: toastId });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, communityId, queryClient]
  );

  // Mutation: Sair da comunidade
  const leaveCommunity = useCallback(
    async (): Promise<boolean> => {
      if (!user) {
        toast.error('Você precisa estar autenticado');
        return false;
      }

      setLoading(true);
      const toastId = toast.loading('Saindo da comunidade...');

      try {
        const { error } = await supabase
          .from('community_members')
          .delete()
          .eq('community_id', communityId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Erro ao sair da comunidade:', error);
          toast.error('Erro ao sair da comunidade', { id: toastId });
          return false;
        }

        toast.success('Você saiu da comunidade', { id: toastId });

        // Invalidar queries relacionadas e refetch imediato
        await queryClient.invalidateQueries({
          queryKey: ['communityMember', communityId],
        });
        await queryClient.refetchQueries({
          queryKey: ['communityMember', communityId, user.id],
        });
        await queryClient.invalidateQueries({
          queryKey: ['community', communityId],
        });
        await queryClient.invalidateQueries({
          queryKey: ['userCommunities', user.id],
        });

        return true;
      } catch (error: any) {
        console.error('Exceção ao sair da comunidade:', error);
        toast.error(error.message || 'Erro desconhecido', { id: toastId });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, communityId, queryClient, isOwner]
  );

  // Mutation: Toggle membership
  const toggleMembership = useCallback(async () => {
    if (isMember) {
      return await leaveCommunity();
    } else {
      return await joinCommunity();
    }
  }, [isMember, joinCommunity, leaveCommunity]);

  return {
    isMember,
    joinCommunity,
    leaveCommunity,
    toggleMembership,
    loading,
  };
}
