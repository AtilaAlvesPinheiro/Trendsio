import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { Send, Search, MessageSquare, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export const MessagesPage = () => {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Fetch conversas ao carregar
  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  // Realtime: escutar mensagens da conversa ativa
  useEffect(() => {
    if (!activeConv?.id) return;

    setMessagesLoading(true);
    fetchMessages(activeConv.id);

    const channel = supabase
      .channel(`messages-${activeConv.id}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConv.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv?.id]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, participant_1(id, username, avatar_url), participant_2(id, username, avatar_url)')
        .or(`participant_1.eq.${user?.id},participant_2.eq.${user?.id}`);
      
      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSelectConv = (conv: any) => {
    setActiveConv(conv);
    fetchMessages(conv.id);
  };

  const handleSearchUsers = async (query: string) => {
    setSearchUsers(query);
    if (!query.trim()) {
      setFoundUsers([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(10);

      if (error) throw error;
      setFoundUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleStartConversation = async (userId: string) => {
    try {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_1.eq.${user?.id},participant_2.eq.${userId}),and(participant_1.eq.${userId},participant_2.eq.${user?.id})`
        )
        .single();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            participant_1: user?.id,
            participant_2: userId,
          })
          .select('id')
          .single();

        if (error) throw error;
        conversationId = newConv?.id;
      }

      await fetchConversations();
      setShowNewConvModal(false);
      setSearchUsers('');
      setFoundUsers([]);
      toast.success('Conversa iniciada!');
    } catch (error: any) {
      console.error('Erro ao iniciar conversa:', error);
      toast.error('Erro ao iniciar conversa');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConv.id,
          sender_id: user?.id,
          content: newMessage,
        });
      
      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      console.error(error.message);
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-secondary/10 border border-border rounded-2xl overflow-hidden relative">
      {/* Modal Nova Conversa */}
      {showNewConvModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center rounded-2xl">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Nova Conversa</h2>
              <button onClick={() => setShowNewConvModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar usuário..."
                value={searchUsers}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {searchingUsers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : foundUsers.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {foundUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleStartConversation(u.id)}
                    className="w-full flex items-center gap-3 p-3 bg-secondary/20 hover:bg-secondary/30 rounded-lg transition-all text-left"
                  >
                    <img
                      src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                      className="w-10 h-10 rounded-full object-cover"
                      alt={u.username}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">@{u.username}</div>
                      {u.full_name && <div className="text-xs text-muted-foreground truncate">{u.full_name}</div>}
                    </div>
                  </button>
                ))}
              </div>
            ) : searchUsers.trim() ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Digite um nome para buscar
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full md:w-80 border-r border-border flex flex-col bg-background">
        <div className="p-4 border-b border-border flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar conversas..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setShowNewConvModal(true)}
            className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all"
            title="Nova conversa"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Carregando...</div>
          ) : conversations.map(conv => {
            const otherUser = conv.participant_1.id === user?.id ? conv.participant_2 : conv.participant_1;
            return (
              <button 
                key={conv.id}
                onClick={() => handleSelectConv(conv)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                  activeConv?.id === conv.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary/20 text-foreground"
                )}
              >
                <img src={otherUser.avatar_url || 'https://avatar.vercel.sh/guest'} className="w-10 h-10 rounded-full object-cover" alt="" />
                <div className="flex-1 overflow-hidden">
                  <div className="font-bold text-sm truncate">{otherUser.username}</div>
                  <div className="text-xs opacity-70 truncate">Clique para conversar</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden md:flex flex-1 flex-col bg-background">
        {activeConv ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeConv?.participant_1?.id && (
                  <>
                    <img 
                      src={activeConv.participant_1.id === user?.id 
                        ? activeConv.participant_2?.avatar_url 
                        : activeConv.participant_1?.avatar_url} 
                      className="w-8 h-8 rounded-full object-cover" 
                      alt="avatar"
                      onError={(e) => { e.currentTarget.src = 'https://avatar.vercel.sh/guest'; }}
                    />
                    <span className="font-bold">
                      {activeConv.participant_1.id === user?.id 
                        ? activeConv.participant_2?.username 
                        : activeConv.participant_1?.username}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/5">
              {messagesLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center py-10 text-muted-foreground text-sm">
                  Nenhuma mensagem ainda. Comece a conversa!
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex w-full",
                    msg.sender_id === user?.id ? "justify-end" : "justify-start"
                  )}>
                    <div className={cn(
                      "max-w-[70%] p-3 rounded-2xl text-sm break-words",
                      msg.sender_id === user?.id 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-secondary/30 text-foreground rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-border flex gap-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 p-3 bg-background border border-border rounded-xl outline-none focus:ring-1 focus:ring-primary text-sm"
              />
              <button type="submit" className="p-3 bg-primary text-white rounded-xl hover:opacity-90 transition-opacity">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p>Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  );
};
