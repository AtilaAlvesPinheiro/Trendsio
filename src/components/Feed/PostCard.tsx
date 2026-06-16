import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, Loader2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { useLikes } from '../../hooks/useLikes';
import { useComments } from '../../hooks/useComments';
import { useAuthStore } from '../../store/authStore';

interface PostProps {
  post: {
    id: string;
    user_id: string;
    content: string;
    media_url: string;
    media_type: 'text' | 'image' | 'video_url';
    community_id?: string;
    created_at: string;
    profiles?: {
      username: string;
      avatar_url: string;
      full_name: string;
    };
    communities?: {
      title: string;
    };
    likes_count?: number;
    comments_count?: number;
  };
}

export const PostCard = ({ post }: PostProps) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { likesCount, isLiked, toggleLike, loading: likesLoading, checkIfLiked, fetchLikesCount } = useLikes(post.id, post.likes_count || 0);
  const { comments, commentsLoading, addComment, addingComment, deleteComment, deletingCommentId } = useComments(post.id);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Load initial like state e contagem de likes
  useEffect(() => {
    checkIfLiked();
    fetchLikesCount();
  }, [post.id, checkIfLiked, fetchLikesCount]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    addComment(commentText);
    setCommentText('');
  };

  const renderMedia = () => {
    switch (post.media_type) {
      case 'image':
        return <img src={post.media_url} alt="Post content" className="w-full rounded-xl object-cover max-h-[500px]" />;
      case 'video_url':
        return (
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
            <iframe 
              className="w-full h-full"
              src={post.media_url.replace('watch?v=', 'embed/')} 
              title="Video content"
              allowFullScreen
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-secondary/10 border border-border rounded-2xl p-4 mb-4 transition-all hover:border-primary/30">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <img 
            src={post.profiles?.avatar_url || 'https://avatar.vercel.sh/guest'} 
            className="w-10 h-10 rounded-full object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity" 
            alt="Avatar"
            onClick={() => navigate(`/profile/${post.user_id}`)}
          />
          <div>
            <div className="flex items-center gap-2">
              <span 
                className="font-bold hover:underline cursor-pointer"
                onClick={() => navigate(`/profile/${post.user_id}`)}
              >
                @{post.profiles?.username}
              </span>
              {post.communities && post.community_id && (
                <span 
                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => navigate(`/community/${post.community_id}`)}
                >
                  #{post.communities.title}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <p className="text-foreground leading-relaxed mb-3">{post.content}</p>
        {renderMedia()}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button 
            onClick={toggleLike}
            disabled={likesLoading}
            className="flex items-center gap-2 text-muted-foreground hover:text-pink-500 transition-colors group disabled:opacity-50"
          >
            <div className="p-2 rounded-full group-hover:bg-pink-500/10 transition-colors">
              <Heart 
                className={cn(
                  "w-5 h-5 transition-all",
                  isLiked && "fill-pink-500 text-pink-500"
                )} 
              />
            </div>
            <span className="text-sm font-medium">{likesCount}</span>
          </button>

          {/* Comments Button */}
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group"
          >
            <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">{comments.length}</span>
          </button>

          {/* Share Button */}
          <button className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors group">
            <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
              <Share2 className="w-5 h-5" />
            </div>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
          {/* Comment Form */}
          {user && (
            <form onSubmit={handlePostComment} className="flex gap-3">
              <img 
                src={user.user_metadata?.avatar_url || 'https://avatar.vercel.sh/guest'} 
                className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0" 
                alt="Your avatar" 
              />
              <div className="flex-1 flex gap-2">
                <input 
                  type="text"
                  placeholder="Adicione um comentário..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                  disabled={addingComment}
                />
                <button 
                  type="submit"
                  disabled={addingComment || !commentText.trim()}
                  className="p-2 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {addingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {commentsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum comentário ainda</p>
            ) : (
              comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <img 
                    src={comment.profiles?.avatar_url || 'https://avatar.vercel.sh/guest'} 
                    className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                    alt="Avatar"
                    onClick={() => navigate(`/profile/${comment.user_id}`)}
                  />
                  <div className="flex-1 bg-background/50 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-sm font-bold cursor-pointer hover:underline"
                          onClick={() => navigate(`/profile/${comment.user_id}`)}
                        >
                          @{comment.profiles?.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      {/* Delete button - only for comment author */}
                      {user?.id === comment.user_id && (
                        <button
                          onClick={() => deleteComment(comment.id)}
                          disabled={deletingCommentId === comment.id}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Deletar comentário"
                        >
                          {deletingCommentId === comment.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-1">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
