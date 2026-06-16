import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { Camera, Loader2, Moon, Sun, Monitor } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useUpdateAvatar } from '../hooks/useStorageUpload';

export const SettingsPage = () => {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const { updateAvatar, loading: avatarLoading, progress } = useUpdateAvatar(user?.id || '');
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setAvatarPreview(data.avatar_url);
      }
    }
    loadProfile();
  }, [user]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload (o hook já mostra os toasts)
    const success = await updateAvatar(file);
    if (success) {
      // Recarregar perfil do banco para pegar a URL pública correta
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user?.id)
        .single();
      
      if (data?.avatar_url) {
        setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
        setAvatarPreview(data.avatar_url);
      }
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          full_name: profile.full_name,
          bio: profile.bio,
        })
        .eq('id', user?.id);

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Update profile exception:', error);
      toast.error(error.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  // Auto-save para campos individuais (onBlur)
  const handleFieldUpdate = async (field: keyof typeof profile, value: string) => {
    setSavingField(field);
    try {
      const updateData = { [field]: value };
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (error) throw error;
      setProfile(prev => ({ ...prev, [field]: value }));
      toast.success(`${field === 'username' ? 'Username' : field === 'full_name' ? 'Nome' : 'Bio'} salvo!`, {
        duration: 1500,
      });
    } catch (error: any) {
      console.error(`Erro ao salvar ${field}:`, error);
      toast.error(`Erro ao salvar ${field}`);
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Tema */}
      <div>
        <h2 className="text-2xl font-bold text-primary mb-6">Aparência</h2>
        <div className="bg-secondary/20 border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-3 block">Tema</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Claro', icon: Sun },
                { value: 'dark', label: 'Escuro', icon: Moon },
                { value: 'system', label: 'Sistema', icon: Monitor },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value as 'light' | 'dark' | 'system')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                    theme === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Perfil */}
      <div>
        <h2 className="text-2xl font-bold text-primary mb-6">Editar Perfil</h2>
        <div className="space-y-6">
          <div className="flex items-center gap-6 mb-8 bg-secondary/20 border border-border rounded-2xl p-6">
            <div className="relative group">
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
                disabled={avatarLoading}
              />
              <img 
                src={avatarPreview || 'https://avatar.vercel.sh/guest'} 
                className="w-24 h-24 rounded-full object-cover border-2 border-primary" 
                alt="Avatar" 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
              >
                {avatarLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
            </div>
            <div>
              <h3 className="text-xl font-bold">Foto de Perfil</h3>
              <p className="text-sm text-muted-foreground">Clique na câmera para alterar</p>
              {avatarLoading && progress > 0 && (
                <p className="text-xs text-primary mt-2">Upload: {progress}%</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Username</label>
              <input 
                type="text" 
                className="w-full p-3 bg-background text-foreground border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                value={profile.username}
                onChange={(e) => setProfile({...profile, username: e.target.value})}
                onBlur={() => handleFieldUpdate('username', profile.username)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome Completo</label>
              <input 
                type="text" 
                className="w-full p-3 bg-background text-foreground border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                value={profile.full_name}
                onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                onBlur={() => handleFieldUpdate('full_name', profile.full_name)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Bio</label>
            <textarea 
              className="w-full p-3 bg-background text-foreground border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary h-32"
              value={profile.bio}
              onChange={(e) => setProfile({...profile, bio: e.target.value})}
              onBlur={() => handleFieldUpdate('bio', profile.bio)}
            />
          </div>

          <div className="text-xs text-muted-foreground pt-4 border-t border-border">
            💡 Alterações são salvas automaticamente quando você sai do campo.
          </div>
        </div>
      </div>
    </div>
  );
};