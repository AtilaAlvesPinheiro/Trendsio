# ⚠️ PRÓXIMOS PASSOS - O QUE FAZER AGORA

## 1️⃣ EXECUTAR SQL MIGRATION (IMPORTANTE!)

**Acesse seu Supabase Dashboard:**
```
https://app.supabase.com/project/[seu-project-id]/sql/new
```

**Copie TODO o conteúdo de `migration_fix_communities.sql` e execute:**
- Isso adicionará índices para performance
- Criará triggers de auditoria
- Configurará Row Level Security

---

## 2️⃣ TESTAR FUNCIONALIDADES

### ✅ Login
```
1. Abra http://localhost:3001
2. Faça login com suas credenciais Supabase
3. Você deve ser redirecionado para /
```

### ✅ Criar Comunidade
```
1. Clique em "Comunidades" no menu esquerdo
2. Clique em "Nova Comunidade"
3. Preencha: Nome, Descrição, Categoria
4. Clique em "Criar Comunidade"
5. Você deve ver sua comunidade em "Minhas Comunidades"
```

### ✅ Criar Post
```
1. Clique em "Criar Post" (botão no topo)
2. Escreva o conteúdo
3. Opcional: Selecione uma comunidade
4. Opcional: Cole URL de imagem/vídeo
5. Clique em "Publicar"
6. O post deve aparecer no feed imediatamente
```

### ✅ Ver Perfil
```
1. Clique no seu nome no menu (top left)
2. Você deve ver:
   - Seu avatar
   - Seu nome e bio
   - Sua lista de posts
3. Clique em "Editar Perfil" para ir para settings
```

### ✅ Tema Escuro/Claro
```
1. Clique em "Configurações"
2. Procure por "Tema"
3. Clique em "Escuro", "Claro" ou "Sistema"
4. A página deve mudar de tema imediatamente
5. Recarregue (F5) - o tema deve persistir
```

---

## 3️⃣ MONITORAR CONSOLE (DEBUG)

Abra DevTools (F12) e procure por:

### ✅ SEM ERROS
```
// Mensagens esperadas:
"Supabase connected"
"Posts loaded"
```

### ❌ COM ERROS
```
// Se ver algum desses erros:
"Failed to fetch posts"
"QueryClient is required"
"No valid session"

// Significa que algo não configurou corretamente
```

---

## 4️⃣ POSSÍVEIS PROBLEMAS E SOLUÇÕES

### Problema: "Posts não aparecem no feed"
```
Solução:
1. Verifique se posts foram inseridos (CREATE POST)
2. Verifique tabela 'posts' no Supabase
3. Recarregue a página (F5)
4. Limpe cache: Ctrl+Shift+Delete
```

### Problema: "Comunidade não é criada"
```
Solução:
1. Verifique autenticação (está logado?)
2. Verifique permissões no Supabase
3. Verifique console (F12) para erros
4. Tente novamente
```

### Problema: "Tema não persiste após recarregar"
```
Solução:
1. Verifique localStorage (F12 → Application → Local Storage)
2. Deve ter uma chave 'theme-preference'
3. Se não tiver, localStorage pode estar desabilitado
4. Teste incógnito (Ctrl+Shift+N)
```

### Problema: "Perfil mostra 'Guest' ou dados errados"
```
Solução:
1. Verifique se seu perfil existe em 'profiles' table
2. Verifique se authStore está sincronizando
3. Recarregue a página
```

---

## 5️⃣ ESTRUTURA DE DADOS ESPERADA

### Tabela: profiles
```sql
SELECT * FROM profiles;
-- Deveria ter: id, username, full_name, bio, avatar_url
```

### Tabela: communities
```sql
SELECT * FROM communities;
-- Deveria ter: id, title, description, category, created_by, created_at
```

### Tabela: posts
```sql
SELECT * FROM posts;
-- Deveria ter: id, user_id, content, media_url, media_type, community_id, created_at
```

### Tabela: community_members
```sql
SELECT * FROM community_members;
-- Deveria ter: user_id, community_id, role, created_at
```

---

## 6️⃣ COMANDOS ÚTEIS (Terminal)

### Verificar se servidor está rodando
```bash
# Já deve estar em outro terminal
npm run dev
# Acesso: http://localhost:3001
```

### Compilar TypeScript
```bash
npx tsc --noEmit
# Deveria sair sem erros
```

### Verificar ESLint
```bash
npx eslint src --max-warnings 0
# Opcional: pode ter warnings que estão OK
```

---

## 7️⃣ CHECKLIST ANTES DE USAR EM PRODUÇÃO

- [ ] SQL Migration executada no Supabase
- [ ] Tema funciona e persiste
- [ ] Comunidades criam e listam
- [ ] Posts criam e aparecem
- [ ] Perfil mostra dados reais
- [ ] Login/Logout funciona
- [ ] Sem erros críticos no console
- [ ] Testado em incógnito (sem cache)
- [ ] Testado com múltiplos usuários
- [ ] Testado em mobile (F12 → Toggle device toolbar)

---

## 🚨 IMPORTANTE!

### Se algo não funcionar:
1. Verifique console (F12)
2. Recarregue a página (F5)
3. Limpe cache (Ctrl+Shift+Delete)
4. Teste incógnito
5. Verifique Supabase Dashboard
6. Verifique permissões RLS

### Documentos de referência:
- `FINAL_SUMMARY.md` - Guia completo
- `IMPROVEMENTS.md` - O que foi mudado
- `STRUCTURE.md` - Arquitetura do projeto
- `database.sql` - Schema do banco

---

**Boa sorte! 🚀**

Se tiver dúvidas, consulte a documentação ou os arquivos de referência listados acima.
