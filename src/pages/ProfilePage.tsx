import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { PostCard } from '../components/Feed/PostCard';
import { useFollows } from '../hooks/useFollows';
import { Loader2, UserPlus, UserCheck, Users, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

const fetchUserPosts = async (userId: string) => {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, content, media_url, media_type, community_id, created_at, profiles!posts_user_id_fkey(username, avatar_url, full_name), communities(title)')
    .eq('user_id', userId)
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

export const ProfilePage = () => {
  const { user: currentUser } = useAuthStore();
  const params = useParams();
  const userId = (params as any)?.id || (params as any)?.userId || currentUser?.id;
  const [messageLoading, setMessageLoading] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['userPosts', userId],
    queryFn: () => fetchUserPosts(userId),
    enabled: !!userId,
  });

  const { isFollowing, followersCount, followingCount, toggleFollow, loading: followLoading } = useFollows(userId || '');
  const isOwnProfile = userId === currentUser?.id;

  const handleStartConversation = async () => {
    if (!currentUser) {
      toast.error('Você precisa estar autenticado');
      return;
    }

    setMessageLoading(true);
    try {
      // Verificar se já existe conversa
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_1.eq.${currentUser.id},participant_2.eq.${userId}),and(participant_1.eq.${userId},participant_2.eq.${currentUser.id})`
        )
        .single();

      let conversationId = existingConv?.id;

      // Se não existir, criar nova conversa
      if (!conversationId) {
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            participant_1: currentUser.id,
            participant_2: userId,
          })
          .select('id')
          .single();

        if (error) throw error;
        conversationId = newConv?.id;
      }

      toast.success('Redirecionando para mensagens...');
      // Usar window.location para redirecionar já que não temos useNavigate aqui
      setTimeout(() => {
        window.location.href = '/messages';
      }, 300);
    } catch (error: any) {
      console.error('Erro ao iniciar conversa:', error);
      toast.error('Erro ao iniciar conversa');
    } finally {
      setMessageLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Perfil não encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-secondary/20 border border-border rounded-3xl overflow-hidden mb-8">
        <div className="h-48 bg-gradient-to-r from-primary/40 to-secondary/40" />
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <img 
              src={profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + profile.username} 
              className="w-32 h-32 rounded-full border-4 border-background object-cover bg-background" 
              alt={profile.username} 
            />
            <div className="flex gap-2">
              {isOwnProfile ? (
                <a 
                  href="/settings"
                  className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:opacity-90 transition-opacity"
                >
                  Editar Perfil
                </a>
              ) : (
                <>
                  <button
                    onClick={() => toggleFollow()}
                    disabled={followLoading}
                    className={cn(
                      "px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2",
                      isFollowing
                        ? "bg-secondary/20 text-foreground border border-border hover:bg-secondary/30"
                        : "bg-primary text-white hover:opacity-90",
                      followLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {followLoading ? (
                      <span className="animate-spin">⌛</span>
                    ) : isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Seguindo</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Seguir</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleStartConversation}
                    disabled={messageLoading}
                    className={cn(
                      "px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white",
                      messageLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {messageLoading ? (
                      <span className="animate-spin">⌛</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Mensagem</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="mb-4">
            <h1 className="text-3xl font-bold">@{profile.username}</h1>
            {profile.full_name && <p className="text-lg text-muted-foreground">{profile.full_name}</p>}
          </div>
          {profile.bio && (
            <p className="text-muted-foreground max-w-xl mb-6">
              {profile.bio}
            </p>
          )}
          <div className="flex gap-8 text-sm">
            <div className="flex flex-col items-center">
              <span className="font-bold text-lg">{posts.length}</span>
              <span className="text-muted-foreground">Posts</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-lg">{followersCount}</span>
              <span className="text-muted-foreground">Seguidores</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-lg">{followingCount}</span>
              <span className="text-muted-foreground">Seguindo</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Posts</h2>
        {posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{isOwnProfile ? 'Você ainda não fez nenhum post' : 'Este usuário ainda não fez nenhum post'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post as any} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
