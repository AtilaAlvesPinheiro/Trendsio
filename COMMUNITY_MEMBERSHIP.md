# Community Membership System

## Overview
Sistema completo para gerenciar entrada/saída de membros em comunidades com React Query para cache automático.

## Architecture

### Hook: useCommunityMembership()
**Localização:** `src/hooks/useCommunityMembership.ts`

```typescript
const { isMember, joinCommunity, leaveCommunity, toggleMembership, loading } = useCommunityMembership(communityId);
```

#### Funcionalidades:
1. **Query** - Verifica status de membro
   - Cache key: `['communityMember', communityId, userId]`
   - Retorna: `boolean`

2. **joinCommunity()** - Adiciona usuário à comunidade
   - Insere em `community_members` com `role: 'member'`
   - Invalidates: `['communityMember', ...]`, `['community', ...]`, `['userCommunities', ...]`
   - Retorna: `boolean` (sucesso/falha)

3. **leaveCommunity()** - Remove usuário da comunidade
   - Deleta de `community_members`
   - Invalidates: mesmas queries acima
   - Retorna: `boolean`

4. **toggleMembership()** - Alterna estado
   - Chama join ou leave dependendo de `isMember`
   - Retorna: `boolean`

5. **loading** - Estado de carregamento
   - `true` durante operações

### RLS Policies Required
```sql
-- INSERT policy
CREATE POLICY "Users can join communities"
ON community_members FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() = user_id
);

-- DELETE policy  
CREATE POLICY "Users can leave communities"
ON community_members FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() = user_id
);

-- SELECT policy
CREATE POLICY "Anyone can view members"
ON community_members FOR SELECT
USING (true);
```

## Usage Examples

### CommunityCard
```typescript
const { isMember, toggleMembership, loading } = useCommunityMembership(community.id);

const handleMembershipClick = async (e) => {
  e.preventDefault();
  e.stopPropagation();
  await toggleMembership();
};

// Botão muda cor baseado em isMember
<button
  onClick={handleMembershipClick}
  disabled={loading}
  className={isMember ? "bg-red-500/10" : "bg-primary/10"}
>
  {isMember ? "Sair" : "Entrar"}
</button>
```

### CommunityDetail
```typescript
const { isMember, toggleMembership, loading } = useCommunityMembership(id);

// Queries separadas para detalhes e posts
const { data: community } = useQuery({
  queryKey: ['community', id],
  queryFn: () => fetchCommunityDetails(id),
});

const { data: posts } = useQuery({
  queryKey: ['communityPosts', id],
  queryFn: () => fetchCommunityPosts(id),
});

// Botão no header com status na sidebar
```

## Cache Invalidation Flow

```
User clicks "Entrar"
    ↓
toggleMembership() called
    ↓
joinCommunity() inserts to DB
    ↓
queryClient.invalidateQueries():
  - ['communityMember', id, userId]  → query re-runs
  - ['community', id]                 → refetch details
  - ['userCommunities', userId]       → update user's list
    ↓
Components auto-re-render with new isMember = true
```

## Error Handling

All functions:
- Wrap operations in try/catch
- Show toast with error message
- Console.error() with full details
- Return boolean for success/failure

## Testing Checklist

- [ ] Click "Entrar" button → toast + button state changes
- [ ] Leave community → state updates, button shows "Entrar" again
- [ ] Refresh page → membership status persists (from DB)
- [ ] CommunityCard shows correct button state
- [ ] CommunityDetail sidebar shows membership status
- [ ] Multiple tabs sync membership status (React Query cache)
