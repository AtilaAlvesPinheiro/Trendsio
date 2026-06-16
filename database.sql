-- ============================================================================
-- REFACTORED DATABASE SCHEMA FOR COMMUNITY PLATFORM
-- Includes: Tables, Storage Buckets with RLS, Triggers, and Policies
-- ============================================================================

-- 1. EXTENSIONS AND ENUMS
-- Nota: O Supabase já suporta gen_random_uuid() nativamente, mas mantemos uuid-ossp por compatibilidade com seu código original.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE post_media_type AS ENUM ('text', 'image', 'video_url');
CREATE TYPE community_category AS ENUM ('Desafio', 'Nicho', 'Trend');
CREATE TYPE community_status AS ENUM ('active', 'archived');
CREATE TYPE member_role AS ENUM ('admin', 'member');

-- 2. TABLES

-- Profiles: Extends auth.users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Communities
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category community_category NOT NULL,
  cover_url TEXT,
  status community_status DEFAULT 'active',
  rules TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Community Members
CREATE TABLE community_members (
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  PRIMARY KEY (community_id, user_id)
);

-- Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  content TEXT,
  media_url TEXT,
  media_type post_media_type DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Likes
CREATE TABLE likes (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  PRIMARY KEY (user_id, post_id)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Follows
CREATE TABLE follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CHECK (participant_1 <> participant_2)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. STORAGE BUCKETS CREATION AND CONFIGURATION
-- Cria os buckets diretamente via SQL (funcional no Supabase moderno)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('community-covers', 'community-covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('post-media', 'post-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

-- AVATARS BUCKET POLICIES
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- COMMUNITY COVERS BUCKET POLICIES
CREATE POLICY "Community covers are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-covers');

CREATE POLICY "Community admins can upload covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-covers'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id::text = split_part(name, '/', 1)
    AND communities.created_by = auth.uid()
  )
);

CREATE POLICY "Community admins can update covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-covers'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id::text = split_part(name, '/', 1)
    AND communities.created_by = auth.uid()
  )
);

CREATE POLICY "Community admins can delete covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-covers'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id::text = split_part(name, '/', 1)
    AND communities.created_by = auth.uid()
  )
);

-- POST MEDIA BUCKET POLICIES
CREATE POLICY "Post media is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

CREATE POLICY "Authenticated users can upload post media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-media'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can update their own post media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-media'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can delete their own post media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-media'
  AND auth.role() = 'authenticated'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- 5. ENHANCED RLS POLICIES FOR DATA TABLES

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Communities are viewable by everyone" ON communities FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create communities" ON communities FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);
CREATE POLICY "Only owners can update communities" ON communities FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Only owners can delete communities" ON communities FOR DELETE USING (auth.uid() = created_by);

ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Community members are viewable by everyone" ON community_members FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join communities" ON community_members FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
CREATE POLICY "Members can leave communities" ON community_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Community admins can remove members" ON community_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = community_members.community_id
    AND communities.created_by = auth.uid()
  )
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are viewable by everyone" ON likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like posts" ON likes FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
CREATE POLICY "Users can unlike own likes" ON likes FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can follow" ON follows FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view their conversations" ON conversations FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Authenticated users can start conversations" ON conversations FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (auth.uid() = participant_1 OR auth.uid() = participant_2));
CREATE POLICY "Participants can update conversations" ON conversations FOR UPDATE USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view messages" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
  )
);
CREATE POLICY "Participants can send messages" ON messages FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
  )
);

-- 6. TRIGGER FOR NEW USER PROFILES

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(md5(random()::text), 1, 5)),
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); -- 'FUNCTION' é o padrão moderno do Postgres 11+

-- 7. INDEXES FOR PERFORMANCE OPTIMIZATION

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
CREATE INDEX IF NOT EXISTS idx_communities_category ON communities(category);
CREATE INDEX IF NOT EXISTS idx_communities_status ON communities(status);

CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_community_id ON posts(community_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 8. HELPER FUNCTIONS (OTIMIZADAS)

-- Function to get community feed (posts ordered by newest first)
-- CORREÇÃO: Subqueries usadas para evitar Produto Cartesiano (multiplicação de linhas) ao contar likes e comments
CREATE OR REPLACE FUNCTION get_community_feed(p_community_id UUID, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  content TEXT,
  media_url TEXT,
  media_type post_media_type,
  created_at TIMESTAMP WITH TIME ZONE,
  likes_count BIGINT,
  comments_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    pr.username,
    pr.avatar_url,
    p.content,
    p.media_url,
    p.media_type,
    p.created_at,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as likes_count,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count
  FROM posts p
  JOIN profiles pr ON p.user_id = pr.id
  WHERE p.community_id = p_community_id
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get community details with member count
-- CORREÇÃO: Subqueries usadas para evitar Produto Cartesiano entre membros e posts
CREATE OR REPLACE FUNCTION get_community_details(p_community_id UUID)
RETURNS TABLE (
  community_id UUID,
  title TEXT,
  description TEXT,
  category community_category,
  cover_url TEXT,
  rules TEXT,
  created_by UUID,
  creator_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  member_count BIGINT,
  post_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    c.category,
    c.cover_url,
    c.rules,
    c.created_by,
    pr.username,
    c.created_at,
    (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id) as member_count,
    (SELECT COUNT(*) FROM posts p WHERE p.community_id = c.id) as post_count
  FROM communities c
  LEFT JOIN profiles pr ON c.created_by = pr.id
  WHERE c.id = p_community_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;