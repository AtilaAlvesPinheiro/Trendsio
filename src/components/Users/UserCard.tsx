import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFollows } from '../../hooks/useFollows';
import { useAuthStore } from '../../store/authStore';
import { UserPlus, UserCheck, Send, ArrowRight } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface UserCardProps {
  user: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
    bio?: string;
  };
}

export const UserCard = ({ user }: UserCardProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { isFollowing, toggleFollow, loading: followLoading } = useFollows(user.id);
  const [messageLoading, setMessageLoading] = React.useState(false);

  const isOwnProfile = user.id === currentUser?.id;

  const handleStartConversation = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
          `and(participant_1.eq.${currentUser.id},participant_2.eq.${user.id}),and(participant_1.eq.${user.id},participant_2.eq.${currentUser.id})`
        )
        .single();

      let conversationId = existingConv?.id;

      // Se não existir, criar nova conversa
      if (!conversationId) {
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            participant_1: currentUser.id,
            participant_2: user.id,
          })
          .select('id')
          .single();

        if (error) throw error;
        conversationId = newConv?.id;
      }

      // Redirecionar para mensagens com a conversa selecionada
      navigate('/messages', { state: { conversationId } });
      toast.success('Abrindo conversa...');
    } catch (error: any) {
      console.error('Erro ao iniciar conversa:', error);
      toast.error('Erro ao iniciar conversa');
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <div className="group relative bg-secondary/10 border border-border rounded-2xl overflow-hidden transition-all hover:border-primary/50 hover:-translate-y-1 duration-300 p-6">
      <div className="flex items-start gap-4 mb-4">
        <img
          src={user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username}
          className="w-16 h-16 rounded-full object-cover border-2 border-border cursor-pointer hover:opacity-80 transition-opacity"
          alt={user.username}
          onClick={() => navigate(`/profile/${user.id}`)}
        />
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-lg truncate cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate(`/profile/${user.id}`)}
          >
            @{user.username}
          </h3>
          {user.full_name && <p className="text-sm text-muted-foreground truncate">{user.full_name}</p>}
        </div>
      </div>

      {user.bio && <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{user.bio}</p>}

      <div className="flex gap-2">
        {!isOwnProfile && (
          <>
            <button
              onClick={() => toggleFollow()}
              disabled={followLoading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium',
                isFollowing
                  ? 'bg-secondary/20 text-foreground border border-border hover:bg-secondary/30'
                  : 'bg-primary/10 text-primary hover:bg-primary hover:text-white',
                followLoading && 'opacity-50 cursor-not-allowed'
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
                'flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all text-sm font-medium',
                messageLoading && 'opacity-50 cursor-not-allowed'
              )}
              title="Enviar mensagem"
            >
              {messageLoading ? (
                <span className="animate-spin">⌛</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </>
        )}

        <button
          onClick={() => navigate(`/profile/${user.id}`)}
          className="flex items-center justify-center px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
