import React from 'react';
import { Feed } from '../components/Feed/Feed';
import { CreatePostModal } from '../components/Feed/CreatePostModal';
import { useCreatePostStore } from '../store/createPostStore';

export const FeedPage = () => {
  const { isOpen, closeModal } = useCreatePostStore();

  return (
    <div className="max-w-2xl mx-auto">
      <Feed />
      <CreatePostModal 
        isOpen={isOpen} 
        onClose={closeModal} 
        onPostCreated={() => {}} 
      />
    </div>
  );
};
