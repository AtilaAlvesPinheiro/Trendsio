import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight, LogIn, LogOut, Trash2 } from 'lucide-react';
import { useCommunityMembership } from '../../hooks/useCommunityMembership';
import { useCommunityAdmin } from '../../hooks/useCommunityAdmin';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

interface CommunityCardProps {
  community: {
    id: string;
    title: string;
    description: string;
    category: string;
    cover_url: string;
    members_count?: number;
    created_by?: string;
  };
  onDeleted?: () => void;
}

export const CommunityCard = ({ community, onDeleted }: CommunityCardProps) => {
  const { user } = useAuthStore();
  const { isMember, toggleMembership, loading: membershipLoading } = useCommunityMembership(community.id);
  const { deleteCommunity, loading: adminLoading } = useCommunityAdmin(community.id);

  const isOwner = community.created_by === user?.id;
  const loading = membershipLoading || adminLoading;

  const handleMembershipClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleMembership();
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await deleteCommunity();
    if (success) {
      onDeleted?.();
    }
  };

  return (
    <div className="group relative bg-secondary/10 border border-border rounded-2xl overflow-hidden transition-all hover:border-primary/50 hover:-translate-y-1 duration-300">
      <div className="h-32 overflow-hidden relative">
        <img 
          src={community.cover_url || 'https://picsum.photos/seed/community/400/200'} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          alt={community.title} 
        />
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-lg uppercase tracking-wider border border-white/10">
            {community.category}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors truncate">
          {community.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
          {community.description}
        </p>
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{community.members_count || 0} membros</span>
          </div>
          <div className="flex gap-2">
            {/* Botão de deletar (só dono) */}
            {isOwner && (
              <button
                onClick={handleDeleteClick}
                disabled={loading}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-medium",
                  "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white",
                  loading && "opacity-50 cursor-not-allowed"
                )}
                title="Deletar comunidade"
              >
                {loading ? (
                  <span className="animate-spin">⌛</span>
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {/* Botão de entrar/sair (para membros e owner) */}
            {isMember && (
              <button
                onClick={handleMembershipClick}
                disabled={loading}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-medium",
                  "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white",
                  loading && "opacity-50 cursor-not-allowed"
                )}
                title={isOwner ? "Sair da comunidade (você é o criador)" : "Sair da comunidade"}
              >
                {loading ? (
                  <span className="animate-spin">⌛</span>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sair</span>
                  </>
                )}
              </button>
            )}

            {/* Botão de entrar (para não membros) */}
            {!isMember && (
              <button
                onClick={handleMembershipClick}
                disabled={loading}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-medium",
                  "bg-primary/10 text-primary hover:bg-primary hover:text-white",
                  loading && "opacity-50 cursor-not-allowed"
                )}
                title="Entrar na comunidade"
              >
                {loading ? (
                  <span className="animate-spin">⌛</span>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Entrar</span>
                  </>
                )}
              </button>
            )}
            
            {/* Botão de ir para comunidade */}
            <Link 
              to={`/community/${community.id}`} 
              className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
