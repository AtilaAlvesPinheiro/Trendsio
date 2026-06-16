import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { CommunityCard } from '../components/Communities/CommunityCard';
import { UserCard } from '../components/Users/UserCard';
import { Loader2, Search } from 'lucide-react';
import { cn } from '../lib/utils';

type ExploreTab = 'communities' | 'users';

export const ExploreCommunities = () => {
  const [activeTab, setActiveTab] = useState<ExploreTab>('communities');
  const [communities, setCommunities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'communities') {
          const { data, error } = await supabase
            .from('communities')
            .select('*, community_members(count)');
          
          if (error) throw error;
          
          const formatted = data?.map(c => ({
            ...c,
            members_count: c.community_members?.[0]?.count || 0
          })) || [];
          
          setCommunities(formatted);
        } else {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, bio');
          
          if (error) throw error;
          setUsers(data || []);
        }
      } catch (error: any) {
        console.error('Error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const filteredCommunities = communities.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-4">Explore</h1>
        <p className="text-muted-foreground mb-6">
          {activeTab === 'communities'
            ? 'Encontre nichos, desafios e tendências do seu interesse.'
            : 'Descubra e conecte-se com novas pessoas.'}
        </p>

        {/* Abas */}
        <div className="flex p-1 bg-secondary/20 rounded-xl border border-border justify-center max-w-xs mx-auto mb-6">
          {(['communities', 'users'] as ExploreTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchTerm('');
              }}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                activeTab === tab
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-blue-500/20'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'communities' ? 'Comunidades' : 'Usuários'}
            </button>
          ))}
        </div>

        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder={activeTab === 'communities' ? 'Buscar comunidade ou categoria...' : 'Buscar usuário...'}
            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : activeTab === 'communities' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommunities.length > 0 ? (
            filteredCommunities.map(community => (
              <CommunityCard key={community.id} community={community} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <p>Nenhuma comunidade encontrada</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <UserCard key={user.id} user={user} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <p>Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
