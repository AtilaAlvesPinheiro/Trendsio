import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Image as ImageIcon, Link as LinkIcon, Send, Upload as UploadIcon, FileText } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { uploadFileToStorage, isValidFileForBucket, isValidMediaUrl } from '../../lib/storage';

type MediaInputMode = 'none' | 'upload' | 'url'; // 'none' = text only, 'upload' = file upload, 'url' = external link

export const CreatePostModal = ({ isOpen, onClose, onPostCreated }: { isOpen: boolean; onClose: () => void; onPostCreated: () => void }) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video_url'>('text');
  const [mediaInputMode, setMediaInputMode] = useState<MediaInputMode>('none');
  const [communityId, setCommunityId] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [communities, setCommunities] = useState<any[]>([]);

  useEffect(() => {
    async function loadCommunities() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('community_members')
          .select('communities(*)')
          .eq('user_id', user.id);
        setCommunities(data?.map(cm => cm.communities) || []);
      } catch (error) {
        console.error('Error loading communities:', error);
      }
    }
    if (isOpen) loadCommunities();
  }, [isOpen, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file for post-media bucket
    if (!isValidFileForBucket(file, 'post-media')) {
      e.target.value = ''; // Reset input
      setMediaFile(null);
      return;
    }

    setMediaFile(file);
    
    // Auto-detect media type based on file
    if (file.type.startsWith('image/')) {
      setMediaType('image');
    } else if (file.type.startsWith('video/')) {
      setMediaType('video_url');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Você precisa estar autenticado');
      return;
    }
    if (!content.trim()) {
      toast.error('Escreva algo antes de publicar');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Publicando post...');

    try {
      let finalMediaUrl = '';

      // Step 1: Upload file to storage if in upload mode
      if (mediaInputMode === 'upload' && mediaFile) {
        toast.loading('Fazendo upload do arquivo...', { id: toastId });
        console.log('Iniciando upload para bucket post-media:', {
          fileName: mediaFile.name,
          fileSize: mediaFile.size,
          fileType: mediaFile.type,
        });

        const uploadResult = await uploadFileToStorage({
          bucket: 'post-media',
          file: mediaFile,
          userId: user.id,
          onProgress: setUploadProgress,
        });

        if (!uploadResult.success) {
          console.error('Upload falhou:', uploadResult.error);
          toast.error(uploadResult.error || 'Erro no upload', { id: toastId });
          setLoading(false);
          return;
        }

        finalMediaUrl = uploadResult.publicUrl || '';
        console.log('Upload bem-sucedido. URL pública:', finalMediaUrl);
      } 
      // Step 2: Use external URL if in URL mode
      else if (mediaInputMode === 'url' && mediaUrl) {
        if (!isValidMediaUrl(mediaUrl, mediaType as 'image' | 'video_url')) {
          console.warn('URL inválida:', mediaUrl);
          toast.error('URL inválida para este tipo de mídia', { id: toastId });
          setLoading(false);
          return;
        }
        finalMediaUrl = mediaUrl;
        console.log('Usando URL externa:', finalMediaUrl);
      }

      // Step 3: Prepare post data
      const postData = {
        user_id: user.id,
        content: content.trim(),
        media_url: finalMediaUrl || null,
        media_type: mediaInputMode === 'none' ? 'text' : mediaType,
        community_id: communityId.trim() ? communityId : null, // Garantir null, não string vazia
      };

      console.log('Preparando insert com dados:', postData);

      toast.loading('Salvando post no banco...', { id: toastId });

      // Step 4: Insert post into database
      const { data: insertedPost, error: insertError } = await supabase
        .from('posts')
        .insert([postData])
        .select();

      if (insertError) {
        console.error('ERRO CRÍTICO - Insert falhou:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        toast.error(`Erro ao criar post: ${insertError.message}`, { id: toastId });
        setLoading(false);
        return;
      }

      console.log('Post criado com sucesso:', insertedPost);

      // Step 5: Invalidate React Query cache para forçar refetch
      toast.loading('Atualizando feed...', { id: toastId });
      
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      console.log('Cache do React Query invalidado');

      toast.success('Post criado com sucesso! 🎉', { id: toastId });
      
      // Reset form
      setContent('');
      setMediaUrl('');
      setMediaFile(null);
      setMediaType('text');
      setMediaInputMode('none');
      setCommunityId('');
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';

      onPostCreated();
      onClose();
    } catch (error: any) {
      console.error('EXCEÇÃO - Erro na criação do post:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      toast.error(error.message || 'Erro desconhecido ao criar post', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-secondary/30 border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-secondary/30">
          <h3 className="text-lg font-bold">Criar novo Post</h3>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full transition-colors" disabled={loading}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleCreatePost} className="p-4 space-y-4">
          {/* Content Textarea */}
          <textarea 
            className="w-full h-24 p-4 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none transition-all"
            placeholder="O que está acontecendo?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            disabled={loading}
          />

          {/* Media Input Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tipo de Mídia</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                type="button"
                onClick={() => {
                  setMediaInputMode('none');
                  setMediaFile(null);
                  setMediaUrl('');
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg border transition-all",
                  mediaInputMode === 'none' ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground hover:border-primary"
                )}
                disabled={loading}
              >
                <FileText className="w-4 h-4" />
                <span className="text-xs font-medium">Apenas Texto</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  setMediaInputMode('upload');
                  setMediaUrl('');
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg border transition-all",
                  mediaInputMode === 'upload' ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground hover:border-primary"
                )}
                disabled={loading}
              >
                <UploadIcon className="w-4 h-4" />
                <span className="text-xs font-medium">Upload</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  setMediaInputMode('url');
                  setMediaFile(null);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg border transition-all",
                  mediaInputMode === 'url' ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground hover:border-primary"
                )}
                disabled={loading}
              >
                <LinkIcon className="w-4 h-4" />
                <span className="text-xs font-medium">Link</span>
              </button>
            </div>
          </div>

          {/* Upload Mode: File Input */}
          {mediaInputMode === 'upload' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Selecionar Arquivo</label>
              <div className="relative">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center"
                  disabled={loading}
                >
                  <div className="flex flex-col items-center gap-2">
                    <UploadIcon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {mediaFile ? mediaFile.name : 'Clique para selecionar arquivo'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Imagem ou Vídeo (máx. 50MB)
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Media Type Selection (for uploads) */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-2">Tipo de Mídia</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setMediaType('image')}
                    className={cn(
                      "flex-1 py-2 rounded-lg border transition-all text-xs font-medium",
                      mediaType === 'image' ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground hover:border-primary"
                    )}
                    disabled={loading}
                  >
                    <ImageIcon className="w-3 h-3 inline mr-1" />
                    Imagem
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMediaType('video_url')}
                    className={cn(
                      "flex-1 py-2 rounded-lg border transition-all text-xs font-medium",
                      mediaType === 'video_url' ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground hover:border-primary"
                    )}
                    disabled={loading}
                  >
                    <FileText className="w-3 h-3 inline mr-1" />
                    Vídeo
                  </button>
                </div>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Upload em progresso</span>
                    <span className="text-xs font-bold text-primary">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* URL Mode: External Link Input */}
          {mediaInputMode === 'url' && (
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Tipo de Mídia</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setMediaType('image')}
                    className={cn(
                      "flex-1 py-2 rounded-lg border transition-all text-xs font-medium",
                      mediaType === 'image' ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground hover:border-primary"
                    )}
                    disabled={loading}
                  >
                    <ImageIcon className="w-3 h-3 inline mr-1" />
                    Imagem
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMediaType('video_url')}
                    className={cn(
                      "flex-1 py-2 rounded-lg border transition-all text-xs font-medium",
                      mediaType === 'video_url' ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground hover:border-primary"
                    )}
                    disabled={loading}
                  >
                    <LinkIcon className="w-3 h-3 inline mr-1" />
                    Vídeo
                  </button>
                </div>
              </div>

              <input 
                type="url" 
                placeholder={mediaType === 'image' ? "https://example.com/image.jpg (ou Imgur, Unsplash, Pexels)" : "https://youtube.com/watch?v=... (ou Vimeo, Dailymotion)"}
                className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {mediaType === 'image' 
                  ? 'Cole uma URL direta de imagem ou de sites como Imgur, Unsplash, Pexels' 
                  : 'Cole uma URL de YouTube, Vimeo ou Dailymotion'}
              </p>
            </div>
          )}

          {/* Community Selection */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Comunidade (opcional)</label>
            <select 
              className="w-full p-3 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              disabled={loading}
            >
              <option value="">Nenhuma comunidade (Post no Feed Geral)</option>
              {communities.map(comm => (
                <option key={comm.id} value={comm.id}>
                  {comm.title}
                </option>
              ))}
            </select>
            {communities.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Você não é membro de nenhuma comunidade ainda. Crie uma para começar!
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading || !content.trim()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⌛</span>
                <span>Publicando...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Publicar Agora</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
