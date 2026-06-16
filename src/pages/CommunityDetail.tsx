import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { PostCard } from '../components/Feed/PostCard';
import { useCommunityMembership } from '../hooks/useCommunityMembership';
import { useCommunityAdmin } from '../hooks/useCommunityAdmin';
import { Loader2, Info, LogIn, LogOut, Trash2, Users, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

const fetchCommunityDetails = async (communityId: string) => {
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .eq('id', communityId)
    .single();

  if (error) throw error;
  return data;
};

const fetchCommunityPosts = async (communityId: string) => {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, content, media_url, media_type, community_id, created_at, profiles!posts_user_id_fkey(username, avatar_url, full_name), communities(title)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Adicionar contagens de likes e comentários para cada post
  const postsWithCounts = await Promise.all(
    (data || []).map(async (post: any) => {
      try {
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        return {
          ...post,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
        };
      } catch (err) {
        return post;
      }
    })
  );

  return postsWithCounts;
};

const fetchCommunityMembers = async (communityId: string) => {
  const { data, error } = await supabase
    .from('community_members')
    .select('user_id, role, joined_at, profiles(username, avatar_url, full_name)')
    .eq('community_id', communityId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const CommunityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Query: Detalhes da comunidade (para obter created_by antes de chamar o hook)
  const { data: community, isLoading: communityLoading, error: communityError } = useQuery({
    queryKey: ['community', id],
    queryFn: () => fetchCommunityDetails(id || ''),
    enabled: !!id,
  });

  const isOwner = community?.created_by === user?.id;
  
  const { isMember, toggleMembership, loading: membershipLoading } = useCommunityMembership(id || '', isOwner);
  const { deleteCommunity, kickMember, loading: adminLoading } = useCommunityAdmin(id || '');
  const [showMembers, setShowMembers] = useState(false);

  // Query: Posts da comunidade
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['communityPosts', id],
    queryFn: () => fetchCommunityPosts(id || ''),
    enabled: !!id,
  });

  // Query: Membros da comunidade
  const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useQuery({
    queryKey: ['communityMembers', id],
    queryFn: () => fetchCommunityMembers(id || ''),
    enabled: !!id,
  });

  const handleToggleMembership = async (e: React.MouseEvent) => {
    e.preventDefault();
    await toggleMembership();
  };

  const handleDeleteClick = async () => {
    const success = await deleteCommunity();
    if (success) {
      navigate('/communities');
    }
  };

  const handleKickMember = async (memberId: string) => {
    const member = members.find(m => m.user_id === memberId);
    if (!member) return;
    
    const success = await kickMember(memberId, (member as any).profiles?.full_name || (member as any).profiles?.username || 'Membro');
    if (success) {
      await refetchMembers();
    }
  };

  const isLoading = communityLoading || postsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (communityError || !community) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Comunidade não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden mb-8 border border-border">
        <div className="h-64 bg-primary/20 relative">
          <img 
            src={community.cover_url || 'https://picsum.photos/seed/comm/800/300'} 
            className="w-full h-full object-cover opacity-60" 
            alt={community.title} 
          />
          <div className="absolute inset-0 flex items-end p-8 bg-gradient-to-t from-background to-transparent">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 w-full">
              <div>
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">{community.title}</h1>
                <p className="text-white/80 max-w-xl mt-2 drop-shadow-md">{community.description}</p>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {/* Botão de deletar (só dono) */}
                {isOwner && (
                  <button 
                    onClick={handleDeleteClick}
                    disabled={adminLoading}
                    className={cn(
                      "px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2",
                      "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white",
                      adminLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {adminLoading ? (
                      <>
                        <span className="animate-spin">⌛</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        <span>Deletar</span>
                      </>
                    )}
                  </button>
                )}
                
                {/* Botão de Entrar/Sair */}
                {isMember && (
                  <button 
                    onClick={handleToggleMembership}
                    disabled={membershipLoading}
                    className={cn(
                      "px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2",
                      "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20",
                      membershipLoading && "opacity-50 cursor-not-allowed"
                    )}
                    title={isOwner ? "Sair da comunidade (você é o criador)" : "Sair da comunidade"}
                  >
                    {membershipLoading ? (
                      <>
                        <span className="animate-spin">⌛</span>
                        <span>Saindo...</span>
                      </>
                    ) : (
                      <>
                        <LogOut className="w-5 h-5" />
                        <span>Sair</span>
                      </>
                    )}
                  </button>
                )}

                {/* Botão de Entrar (apenas para não membros) */}
                {!isMember && (
                  <button 
                    onClick={handleToggleMembership}
                    disabled={membershipLoading}
                    className={cn(
                      "px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2",
                      "bg-primary text-white hover:opacity-90",
                      membershipLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {membershipLoading ? (
                      <>
                        <span className="animate-spin">⌛</span>
                        <span>Entrando...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        <span>Participar Agora</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Informações + Membros */}
        <div className="lg:col-span-1 space-y-6">
          {/* Informações da Comunidade */}
          <div className="p-6 bg-secondary/10 border border-border rounded-2xl">
            <div className="flex items-center gap-2 mb-4 text-primary font-bold">
              <Info className="w-5 h-5" />
              <h3>Sobre</h3>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Categoria:</span>
                <span className="text-foreground font-medium capitalize">{community.category}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-foreground font-medium capitalize">{community.status || 'active'}</span>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="font-bold mb-2 text-foreground">Regras:</p>
                <p className="whitespace-pre-line text-sm">{community.rules || 'Siga as diretrizes da comunidade.'}</p>
              </div>
            </div>
          </div>

          {/* Status de Membro */}
          <div className={cn(
            "p-4 rounded-2xl border",
            isMember 
              ? "bg-green-500/10 border-green-500/20" 
              : "bg-muted/50 border-border"
          )}>
            <div className="flex items-center gap-2 text-sm font-medium">
              {isMember ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-green-600">Você é membro</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                  <span className="text-muted-foreground">Você não é membro</span>
                </>
              )}
            </div>
          </div>

          {/* Membros */}
          <div className="p-6 bg-secondary/10 border border-border rounded-2xl">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center gap-2 mb-4 text-primary font-bold w-full hover:opacity-80 transition"
            >
              <Users className="w-5 h-5" />
              <span>Membros ({members.length})</span>
            </button>

            {showMembers && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {membersLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro</p>
                ) : (
                  members.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between gap-2 p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <img 
                          src={(member as any).profiles?.avatar_url || 'https://avatar.vercel.sh/guest'} 
                          className="w-8 h-8 rounded-full object-cover border border-border" 
                          alt="Avatar" 
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {(member as any).profiles?.full_name || (member as any).profiles?.username}
                          </p>
                          {member.role === 'admin' && (
                            <div className="flex items-center gap-1 text-xs text-yellow-600">
                              <Shield className="w-3 h-3" />
                              <span>Admin</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Botão de expulsar (só admin e não a si mesmo) */}
                      {isOwner && member.user_id !== user?.id && (
                        <button
                          onClick={() => handleKickMember(member.user_id)}
                          disabled={adminLoading}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-all disabled:opacity-50"
                          title="Expulsar membro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Feed da Comunidade */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-2xl font-bold mb-4">Posts</h2>
          {posts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p>Nenhum post nesta comunidade ainda.</p>
              {isMember && <p className="text-sm mt-2">Seja o primeiro a postar!</p>}
            </div>
          ) : (
            posts.map(post => <PostCard key={post.id} post={post as any} />)
          )}
        </div>
      </div>
    </div>
  );
};
