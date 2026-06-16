/**
 * CreateCommunityModal Component
 * Modal para criar comunidade com upload de capa
 */

import React, { useState, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { CommunityCoverUploadPicker } from '../UI/CommunityCoverUploadPicker';
import { uploadFileToStorage } from '../../lib/storage';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommunityCreated?: () => void;
}

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  isOpen,
  onClose,
  onCommunityCreated,
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Nicho' as 'Desafio' | 'Nicho' | 'Trend',
    rules: '',
  });

  const handleCoverFileSelected = (file: File) => {
    setCoverFile(file);
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.title.trim()) {
      toast.error('Digite um título para a comunidade');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create community entry (without cover URL first)
      const { data: newCommunity, error: createError } = await supabase
        .from('communities')
        .insert([
          {
            title: formData.title.trim(),
            description: formData.description.trim(),
            category: formData.category,
            rules: formData.rules.trim() || null,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (createError) {
        toast.error(`Erro ao criar comunidade: ${createError.message}`);
        setLoading(false);
        return;
      }

      // Step 2: Add creator as member (admin role)
      const { error: memberError } = await supabase
        .from('community_members')
        .insert([
          {
            community_id: newCommunity.id,
            user_id: user.id,
            role: 'admin',
          },
        ]);

      if (memberError) {
        console.error('Error adding creator as member:', memberError);
        // Continue anyway, community was created
      }

      // Step 3: Upload cover if provided
      if (coverFile && newCommunity.id) {
        try {
          toast.loading('Fazendo upload da capa...');
          
          const uploadResult = await uploadFileToStorage({
            bucket: 'community-covers',
            file: coverFile,
            userId: user.id,
            customPath: newCommunity.id,
          });

          if (uploadResult.success && uploadResult.publicUrl) {
            // Update community with cover URL
            await supabase
              .from('communities')
              .update({ cover_url: uploadResult.publicUrl })
              .eq('id', newCommunity.id);

            toast.dismiss();
          }
        } catch (error) {
          console.error('Cover upload error:', error);
          // Community was created, cover upload is optional
          toast.dismiss();
        }
      }

      toast.success('Comunidade criada com sucesso! 🎉');
      
      // Reset form
      setFormData({ title: '', description: '', category: 'Nicho', rules: '' });
      setCoverFile(null);
      setCoverPreviewUrl(null);

      if (onCommunityCreated) {
        onCommunityCreated();
      }
      onClose();
    } catch (error: any) {
      console.error('Community creation error:', error);
      toast.error(error.message || 'Erro ao criar comunidade');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-secondary/30 border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-secondary/30">
          <h3 className="text-lg font-bold">Criar Comunidade</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-full transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateCommunity} className="p-6 space-y-6">
          {/* Cover Upload */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-3">
              Capa da Comunidade (opcional)
            </label>
            <CommunityCoverUploadPicker
              currentCoverUrl={coverPreviewUrl || undefined}
              onFileSelected={handleCoverFileSelected}
              isLoading={loading}
              communityTitle={formData.title || 'Comunidade'}
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Título *
            </label>
            <input
              type="text"
              maxLength={100}
              className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Nome da sua comunidade"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.title.length}/100
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Descrição
            </label>
            <textarea
              maxLength={500}
              className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all resize-none h-24"
              placeholder="Descreva sua comunidade em poucas palavras..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.description.length}/500
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Categoria
            </label>
            <select
              className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as 'Desafio' | 'Nicho' | 'Trend',
                })
              }
              disabled={loading}
            >
              <option value="Desafio">📋 Desafio</option>
              <option value="Nicho">🎯 Nicho</option>
              <option value="Trend">📈 Trend</option>
            </select>
          </div>

          {/* Rules */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Regras (opcional)
            </label>
            <textarea
              maxLength={1000}
              className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all resize-none h-20"
              placeholder="Defina as regras da comunidade aqui..."
              value={formData.rules}
              onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.rules.length}/1000
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.title.trim()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Criando...</span>
              </>
            ) : (
              <span>Criar Comunidade</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
