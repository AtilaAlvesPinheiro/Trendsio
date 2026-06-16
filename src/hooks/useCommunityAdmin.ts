import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/**
 * Hook para gerenciar operações de admin em comunidades
 * Fornece: deletar comunidade, expulsar membros
 */
export function useCommunityAdmin(communityId: string) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Deletar comunidade (só dono)
  const deleteCommunity = useCallback(
    async (): Promise<boolean> => {
      if (!user) {
        toast.error('Você precisa estar autenticado');
        return false;
      }

      // Confirmar exclusão
      const confirmDelete = window.confirm(
        'Tem certeza que deseja deletar esta comunidade? Esta ação não pode ser desfeita.'
      );

      if (!confirmDelete) return false;

      setLoading(true);
      const toastId = toast.loading('Deletando comunidade...');

      try {
        // Verificar se é o criador
        const { data: community, error: commError } = await supabase
          .from('communities')
          .select('created_by')
          .eq('id', communityId)
          .single();

        if (commError) {
          toast.error('Comunidade não encontrada', { id: toastId });
          return false;
        }

        if (community.created_by !== user.id) {
          toast.error('Você não tem permissão para deletar esta comunidade', { id: toastId });
          return false;
        }

        // Deletar comunidade (cascade deletará members e posts)
        const { error: deleteError } = await supabase
          .from('communities')
          .delete()
          .eq('id', communityId);

        if (deleteError) {
          console.error('Erro ao deletar comunidade:', deleteError);
          toast.error('Erro ao deletar comunidade', { id: toastId });
          return false;
        }

        toast.success('Comunidade deletada com sucesso', { id: toastId });

        // Invalidar queries
        await queryClient.invalidateQueries({
          queryKey: ['userCommunities'],
        });
        await queryClient.invalidateQueries({
          queryKey: ['allCommunities'],
        });
        await queryClient.invalidateQueries({
          queryKey: ['community', communityId],
        });

        return true;
      } catch (error: any) {
        console.error('Exceção ao deletar comunidade:', error);
        toast.error(error.message || 'Erro desconhecido', { id: toastId });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, communityId, queryClient]
  );

  // Expulsar membro (só admin/dono)
  const kickMember = useCallback(
    async (memberId: string, memberName: string): Promise<boolean> => {
      if (!user) {
        toast.error('Você precisa estar autenticado');
        return false;
      }

      // Confirmar expulsão
      const confirmKick = window.confirm(
        `Tem certeza que deseja expulsar ${memberName} da comunidade?`
      );

      if (!confirmKick) return false;

      setLoading(true);
      const toastId = toast.loading('Expulsando membro...');

      try {
        // Verificar se é o dono da comunidade
        const { data: community, error: commError } = await supabase
          .from('communities')
          .select('created_by')
          .eq('id', communityId)
          .single();

        if (commError) {
          toast.error('Comunidade não encontrada', { id: toastId });
          return false;
        }

        if (community.created_by !== user.id) {
          toast.error('Você não tem permissão para expulsar membros', { id: toastId });
          return false;
        }

        // Expulsar membro
        const { error: deleteError } = await supabase
          .from('community_members')
          .delete()
          .eq('community_id', communityId)
          .eq('user_id', memberId);

        if (deleteError) {
          console.error('Erro ao expulsar membro:', deleteError);
          toast.error('Erro ao expulsar membro', { id: toastId });
          return false;
        }

        toast.success(`${memberName} foi expulso da comunidade`, { id: toastId });

        // Invalidar queries
        await queryClient.invalidateQueries({
          queryKey: ['communityMembers', communityId],
        });

        return true;
      } catch (error: any) {
        console.error('Exceção ao expulsar membro:', error);
        toast.error(error.message || 'Erro desconhecido', { id: toastId });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, communityId, queryClient]
  );

  return {
    deleteCommunity,
    kickMember,
    loading,
  };
}
