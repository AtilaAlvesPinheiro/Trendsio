import { create } from 'zustand';

interface CreatePostState {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useCreatePostStore = create<CreatePostState>((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}));
