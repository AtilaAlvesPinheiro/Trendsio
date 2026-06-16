# 🚀 Trends.io - Rede Social de Trends e Comunidades

Uma rede social moderna focada em conteúdo rápido, desafios criativos e comunidades de nicho.

## 🛠️ Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Estilização:** Tailwind CSS + TweakCN (Design System)
- **Backend/BaaS:** Supabase (Auth, Database, Storage, Realtime)
- **Estado:** Zustand + React Query

## 📁 Estrutura do Projeto
- `src/components`: Componentes reutilizáveis divididos por domínio (Feed, Chat, etc)
- `src/pages`: Telas principais da aplicação
- `src/services`: Configurações de API e Supabase
- `src/store`: Gerenciamento de estado global
- `src/hooks`: Lógica de negócio extraída para hooks customizados

## 🚀 Como Rodar o Projeto
1. Clone o repositório.
2. Execute `npm install`.
3. Configure as variáveis de ambiente no arquivo `.env`.
4. Execute `npm run dev`.

## 🗄️ Setup do Banco de Dados
Execute o script `database.sql` no editor SQL do seu painel Supabase para criar as tabelas e as políticas de RLS.
