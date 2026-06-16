/**
 * AvatarUploadPicker Component
 * Reutilizável para upload de fotos de perfil com preview
 */

import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isValidFileForBucket } from '../../lib/storage';
import toast from 'react-hot-toast';

interface AvatarUploadPickerProps {
  currentAvatarUrl?: string;
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
  previewOnly?: boolean; // If true, don't allow file selection
}

export const AvatarUploadPicker: React.FC<AvatarUploadPickerProps> = ({
  currentAvatarUrl,
  onFileSelected,
  isLoading = false,
  previewOnly = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!isValidFileForBucket(file, 'avatars')) {
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
    <div className="relative inline-block">
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
          "relative w-24 h-24 rounded-full overflow-hidden border-2 transition-all",
          previewOnly ? "border-border cursor-default" : "border-border hover:border-primary cursor-pointer",
          isLoading && "opacity-50"
        )}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {!previewOnly && !isLoading && (
              <>
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            {isLoading ? (
              <span className="animate-spin text-primary">⌛</span>
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
        )}
      </button>
    </div>
  );
};
