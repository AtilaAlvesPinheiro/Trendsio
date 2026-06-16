import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { PostCard } from './PostCard';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type Tab = 'for-you' | 'following' | 'communities';

interface FeedProps {
  onPostCreated?: () => void;
}

const fetchPosts = async (tab: Tab, userId?: string) => {
  let query = supabase
    .from('posts')
    .select('id, user_id, content, media_url, media_type, community_id, created_at, profiles!posts_user_id_fkey(username, avatar_url, full_name), communities(title)')
    .order('created_at', { ascending: false });

  if (tab === 'communities') {
    query = query.not('community_id', 'is', null);
  } else if (tab === 'following' && userId) {
    // Buscar IDs que o usuário segue
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    
    const followingIds = followingData?.map(f => f.following_id) || [];
    
    if (followingIds.length === 0) {
      return [];
    }
    
    query = query.in('user_id', followingIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar posts:', error);
    throw error;
  }
  
  // Transformar profiles e communities de arrays para objetos
  let transformedData = data?.map((post: any) => ({
    ...post,
    profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles,
    communities: Array.isArray(post.communities) ? post.communities[0] : post.communities,
  })) || [];

  // Adicionar contagens de likes e comentários para cada post
  transformedData = await Promise.all(
    transformedData.map(async (post: any) => {
      try {
        // Contar likes
        const { count: likesCount, error: likesError } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Contar comentários
        const { count: commentsCount, error: commentsError } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        if (!likesError && !commentsError) {
          return {
            ...post,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
          };
        }
        return post;
      } catch (err) {
        console.error('Erro ao contar likes/comentários:', err);
        return post;
      }
    })
  );
  
  console.log(`Posts carregados (${tab}):`, transformedData.length);
  return transformedData;
};

export const Feed = ({ onPostCreated }: FeedProps) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('for-you');

  const { data: posts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['posts', activeTab, user?.id],
    queryFn: () => fetchPosts(activeTab, user?.id),
    staleTime: 1000 * 60, // 1 minuto
  });

  const handlePostCreated = async () => {
    console.log('handlePostCreated chamado, refetch disparado');
    await refetch();
    onPostCreated?.();
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive font-medium">Erro ao carregar posts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex p-1 bg-secondary/20 rounded-xl border border-border sticky top-16 z-10">
        {(['for-you', 'following', 'communities'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all",
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-lg shadow-blue-500/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === 'for-you' && 'Para Você'}
            {tab === 'following' && 'Seguindo'}
            {tab === 'communities' && 'Comunidades'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground font-medium">
            {activeTab === 'communities'
              ? 'Nenhum post em comunidades ainda'
              : 'Nenhum post disponível'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
            />
          ))}
        </div>
      )}
    </div>
  );
};
