/**
 * CommunityCoverUploadPicker Component
 * Seletor de capa de comunidade com preview
 */

import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isValidFileForBucket } from '../../lib/storage';

interface CommunityCoverUploadPickerProps {
  currentCoverUrl?: string;
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
  previewOnly?: boolean;
  communityTitle?: string;
}

export const CommunityCoverUploadPicker: React.FC<CommunityCoverUploadPickerProps> = ({
  currentCoverUrl,
  onFileSelected,
  isLoading = false,
  previewOnly = false,
  communityTitle = 'Comunidade',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentCoverUrl || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file for community-covers bucket
    if (!isValidFileForBucket(file, 'community-covers')) {
      e.target.value = '';
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    onFileSelected(file);
  };

  const handleClick = () => {
    if (!previewOnly && !isLoading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={previewOnly || isLoading}
        className={cn(
          "relative w-full h-48 rounded-xl overflow-hidden border-2 transition-all",
          previewOnly ? "border-border cursor-default" : "border-border hover:border-primary cursor-pointer",
          isLoading && "opacity-50"
        )}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={`Capa de ${communityTitle}`}
              className="w-full h-full object-cover"
            />
            {!previewOnly && !isLoading && (
              <>
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex flex-col items-center justify-center gap-2">
            {isLoading ? (
              <span className="animate-spin text-primary text-2xl">⌛</span>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  {previewOnly ? 'Capa da Comunidade' : 'Clique para adicionar capa'}
                </p>
              </>
            )}
          </div>
        )}
      </button>

      <p className="text-xs text-muted-foreground mt-2">
        Formato: JPG, PNG ou WebP • Máximo 10MB • Proporção recomendada: 16:9
      </p>
    </div>
  );
};
