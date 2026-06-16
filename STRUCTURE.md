# 🗺️ Mapa de Estrutura

```text
/
├── index.html            # Ponto de entrada HTML
├── package.json          # Dependências e scripts
├── tailwind.config.ts    # Configuração de design system
├── tsconfig.json         # Configuração do TypeScript
├── vite.config.ts        # Configuração do build/dev server
├── database.sql          # Script de infraestrutura de dados
│
└── src/
    ├── main.tsx          # Renderização do React
    ├── App.tsx           # Rotas e Providers
    ├── index.css         # Variáveis CSS do tema TweakCN
    │
    ├── components/       # Componentes de UI
    │   ├── Layout/       # Sidebar, Header, MainLayout
    │   ├── Feed/         # PostCard, CreatePostModal
    │   ├── Communities/  # CommunityCard
    │   └── Chat/         # Interface de mensagens
    │
    ├── pages/            # Telas (Auth, Feed, Explore, Profile, Messages)
    ├── services/         # Cliente Supabase e Helpers
    ├── store/            # Estados globais (Zustand)
    └── lib/              # Utilitários (cn, formatters)
```
