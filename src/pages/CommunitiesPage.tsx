import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { CommunityCard } from '../components/Communities/CommunityCard';
import { CreateCommunityModal } from '../components/Communities/CreateCommunityModal';
import { Loader2, Plus, Search } from 'lucide-react';
import { useCreatePostStore } from '../store/createPostStore';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

const fetchUserCommunities = async (userId: string) => {
  // Buscar comunidades do usuário com contagem de membros
  const { data: memberships, error: memberError } = await supabase
    .from('community_members')
    .select('community_id, communities(id, title, description, category, cover_url, created_by)')
    .eq('user_id', userId);

  if (memberError) throw memberError;

  // Para cada comunidade, contar membros
  const communitiesWithCounts = await Promise.all(
    (memberships || []).map(async (membership) => {
      const { count, error: countError } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', membership.community_id);

      if (countError) throw countError;

      return {
        ...membership.communities,
        members_count: count || 0,
      };
    })
  );

  return communitiesWithCounts;
};

const fetchAllCommunities = async () => {
  // Buscar todas as comunidades
  const { data, error } = await supabase
    .from('communities')
    .select('id, title, description, category, cover_url, created_by')
    .eq('status', 'active');

  if (error) throw error;

  // Para cada comunidade, contar membros
  const communitiesWithCounts = await Promise.all(
    (data || []).map(async (community) => {
      const { count, error: countError } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', community.id);

      if (countError) throw countError;

      return {
        ...community,
        members_count: count || 0,
      };
    })
  );

  return communitiesWithCounts;
};

export const CommunitiesPage = () => {
  const { user } = useAuthStore();
  const { openModal } = useCreatePostStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: userCommunities = [], refetch: refetchUserCommunities } = useQuery({
    queryKey: ['userCommunities', user?.id],
    queryFn: () => fetchUserCommunities(user?.id || ''),
    enabled: !!user?.id,
  });

  const { data: allCommunities = [] } = useQuery({
    queryKey: ['allCommunities'],
    queryFn: fetchAllCommunities,
  });

  const userCommunityIds = new Set(userCommunities.map(c => (c as any).id));
  const suggestedCommunities = allCommunities.filter(c => !userCommunityIds.has((c as any).id));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Modal de Criação */}
      <CreateCommunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCommunityCreated={() => refetchUserCommunities()}
      />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Minhas Comunidades</h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Nova Comunidade
          </button>
        </div>
      </div>

      {/* Minhas Comunidades */}
      {userCommunities.length === 0 ? (
        <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-border">
          <p className="text-muted-foreground mb-4">Você ainda não entrou em nenhuma comunidade</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:opacity-90"
          >
            Criar sua primeira comunidade
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {userCommunities.map(community => (
            <CommunityCard 
              key={(community as any).id} 
              community={community as any}
              onDeleted={() => refetchUserCommunities()}
            />
          ))}
        </div>
      )}

      {/* Comunidades Sugeridas */}
      {suggestedCommunities.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold mb-4">Comunidades Sugeridas</h3>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar comunidades..."
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestedCommunities
              .filter(c => 
                c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.description?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(community => (
                <CommunityCard key={community.id} community={community} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
