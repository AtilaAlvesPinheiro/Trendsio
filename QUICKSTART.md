# ⚡ QUICK START GUIDE - Trends.io

## 🚀 Em 5 Minutos

### 1️⃣ Servidor Já Está Rodando
```bash
# Terminal já deve ter:
npm run dev
# ✅ http://localhost:3001
```

### 2️⃣ Fazer Login
```
Vá para http://localhost:3001
├─ Se não tem conta: Clique "Cadastre-se"
└─ Se tem: Faça login com email + senha
```

### 3️⃣ Testar Funcionalidades

#### Criar Post
```
Home (/)
├─ Clique em "Criar Post" (botão no topo)
├─ Escreva seu post
├─ Clique em "Publicar"
└─ Veja aparecer no feed
```

#### Criar Comunidade
```
Comunidades (/communities)
├─ Clique em "Nova Comunidade"
├─ Preencha: Nome, Descrição, Categoria
├─ Clique em "Criar Comunidade"
└─ Veja em "Minhas Comunidades"
```

#### Mudar Tema
```
Configurações (/settings)
├─ Procure por "Tema"
├─ Clique em "Escuro" ou "Claro"
├─ Recarregue a página (F5)
└─ Tema persiste
```

#### Ver Perfil
```
Clique no seu nome (top left)
├─ Veja seu avatar, bio, nome
├─ Veja seus posts
└─ Clique "Editar Perfil" para voltar a settings
```

---

## 🔧 Solução de Problemas

### ❌ "Login não funciona"
```
✓ Verificar:
  1. Supabase project está rodando? 
     → app.supabase.com
  2. Email + senha estão corretos?
  3. .env tem VITE_SUPABASE_URL?
```

### ❌ "Posts não aparecem"
```
✓ Verificar:
  1. Você está autenticado?
  2. Seu perfil existe em "profiles" table?
  3. Recarregue a página (F5)
  4. Abra Console (F12) para erros
```

### ❌ "Tema não persiste"
```
✓ Verificar:
  1. localStorage ativado? (F12 → Application)
  2. Teste em incógnito (Ctrl+Shift+N)
  3. Limpe cookies (Ctrl+Shift+Delete)
```

### ❌ "Comunidade não criou"
```
✓ Verificar:
  1. Você está logado?
  2. Todos os campos preenchidos?
  3. Console mostra erro? (F12 → Console)
  4. Tente novamente
```

---

## 📋 Tarefas Pendentes (Próximas)

### 🔴 HOJE (Antes de usar)
- [ ] Executar `migration_fix_communities.sql` no Supabase
- [ ] Testar login
- [ ] Criar 1 comunidade
- [ ] Criar 1 post
- [ ] Mudar tema

### 🟡 ESSA SEMANA
- [ ] Implementar likes
- [ ] Implementar comentários
- [ ] Upload de imagens

### 🟢 PRÓXIMAS SPRINTS
- [ ] Mensagens em tempo real
- [ ] Notificações
- [ ] Seguir usuários

---

## 📁 Estrutura de Pastas

```
src/
├── pages/          ← Páginas das rotas
├── components/     ← Componentes reutilizáveis
├── context/        ← Tema (dark/light)
├── store/          ← Zustand stores
├── services/       ← Supabase client
├── lib/            ← Utilitários
├── App.tsx         ← Router principal
└── main.tsx        ← Entry point
```

---

## 💾 Backup da Session

```bash
# Se o servidor desligar:
Ctrl+C para parar
npm run dev para reiniciar
# Dados persistem no Supabase 🔒
```

---

## 📞 Documentação Completa

Consulte estes arquivos para mais detalhes:

```
FINAL_SUMMARY.md ........... Resumo completo
NEXT_STEPS.md .............. Próximas ações
ARCHITECTURE.md ............ Arquitetura
DELIVERY.md ................ O que foi entregue
IMPROVEMENTS.md ............ O que mudou
database.sql ............... Schema do banco
```

---

## 🎯 Métricas (Esperadas)

| Métrica | Valor |
|---------|-------|
| Tempo de login | < 2s |
| Criar post | < 1s |
| Criar comunidade | < 1s |
| Carregar perfil | < 1s |
| Mudar tema | Imediato |

---

## ✅ Checklist Antes de "Go Live"

- [ ] Migration SQL executada
- [ ] Teste login com email existente
- [ ] Teste login com novo email
- [ ] Crie 3+ comunidades
- [ ] Crie 5+ posts
- [ ] Veja posts no perfil
- [ ] Teste tema dark/light
- [ ] Recarregue página (tema persiste?)
- [ ] Teste mobile (F12 → Toggle device toolbar)
- [ ] Sem erros no console (F12 → Console)

---

## 🎓 Comandos Úteis

```bash
# Start dev server
npm run dev

# Compilar TypeScript
npx tsc --noEmit

# Lint
npx eslint src

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🆘 PRECISA DE AJUDA?

1. Verifique console (F12 → Console)
2. Leia NEXT_STEPS.md
3. Leia FINAL_SUMMARY.md
4. Verifique Supabase Dashboard

---

## 🎊 Sucesso! 🎊

Você agora tem uma aplicação social completamente funcional:

✅ Autenticação  
✅ Posts  
✅ Comunidades  
✅ Perfil  
✅ Tema escuro/claro  

**Divirta-se desenvolvendo! 🚀**

---

**Criado:** 2026-06-16  
**Versão:** 1.0  
**Tempo de leitura:** ~3 minutos
