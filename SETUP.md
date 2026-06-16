# 🛠️ Guia de Setup Rápido

Siga estes passos para colocar a Trends.io no ar em menos de 10 minutos.

### 1. Supabase Setup
1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** $\rightarrow$ **New Query** $\rightarrow$ Cole o conteúdo de `database.sql` $\rightarrow$ **Run**.
3. Vá em **Storage** $\rightarrow$ Crie 3 buckets públicos:
   - `avatars`
   - `community-covers`
   - `post-media`

### 2. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 3. Instalação e Execução
```bash
npm install
npm run dev
```

### 4. Deploy na Vercel
1. Suba o código para o GitHub.
2. Importe o projeto na Vercel.
3. Adicione as mesmas variáveis do `.env` nas configurações de ambiente da Vercel.
4. Clique em **Deploy**.
