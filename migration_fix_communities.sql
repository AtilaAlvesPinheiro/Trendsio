-- MIGRATION: Fix Communities Structure
-- Este script limpa dados antigos e adiciona melhorias estruturais

-- 1. Remover dados de teste se existirem
DELETE FROM community_members WHERE user_id IN (
  SELECT id FROM profiles WHERE username LIKE '%_test%' OR username LIKE '%exemplo%'
);

DELETE FROM communities WHERE created_by IN (
  SELECT id FROM profiles WHERE username LIKE '%_test%' OR username LIKE '%exemplo%'
);

-- 2. Adicionar coluna de atualização nas comunidades se não existir
ALTER TABLE communities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- 3. Criar trigger para atualizar updated_at em comunidades
CREATE OR REPLACE FUNCTION update_communities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_communities_updated_at_trigger ON communities;
CREATE TRIGGER update_communities_updated_at_trigger
BEFORE UPDATE ON communities
FOR EACH ROW
EXECUTE FUNCTION update_communities_updated_at();

-- 4. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_community_id ON posts(community_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);

-- 5. Definir RLS (Row Level Security) se não existir
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para comunidades
CREATE POLICY "Comunidades são públicas" ON communities
  FOR SELECT USING (status = 'active');

CREATE POLICY "Usuários podem ver seus próprios dados" ON profiles
  FOR SELECT USING (auth.uid() = id OR true);

-- Política para posts (visíveis se a comunidade é pública ou o usuário é membro)
CREATE POLICY "Posts visíveis" ON posts
  FOR SELECT USING (
    community_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM communities 
      WHERE communities.id = posts.community_id 
      AND communities.status = 'active'
    )
  );
