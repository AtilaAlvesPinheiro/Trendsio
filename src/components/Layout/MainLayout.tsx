import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Compass, 
  MessageSquare, 
  User, 
  Settings, 
  LogOut, 
  TrendingUp, 
  PlusCircle 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useCreatePostStore } from '../../store/createPostStore';

const NavItem = ({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active: boolean }) => (
  <Link 
    to={to} 
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-primary text-primary-foreground shadow-lg shadow-blue-500/20" 
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-white" : "group-hover:text-foreground")} />
    <span className="font-medium">{label}</span>
  </Link>
);

export const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuthStore();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-border p-4 bg-background">
      <div className="px-4 py-8 mb-4">
        <h1 className="text-2xl font-bold text-primary tracking-tight">Trends.io</h1>
      </div>

      <nav className="flex-1 space-y-2">
        <NavItem to="/" icon={Home} label="Para Você" active={location.pathname === '/'} />
        <NavItem to="/explore" icon={Compass} label="Explorar" active={location.pathname === '/explore'} />
        <NavItem to="/communities" icon={TrendingUp} label="Comunidades" active={location.pathname === '/communities'} />
        <NavItem to="/messages" icon={MessageSquare} label="Mensagens" active={location.pathname === '/messages'} />
        <NavItem to="/profile" icon={User} label="Meu Perfil" active={location.pathname === '/profile'} />
      </nav>

      <div className="mt-auto space-y-2 pt-4 border-t border-border">
        <NavItem to="/settings" icon={Settings} label="Configurações" active={location.pathname === '/settings'} />
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export const Header = () => {
  const { openModal } = useCreatePostStore();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between">
      <div className="md:hidden font-bold text-xl text-primary">Trends.io</div>
      <div className="hidden md:block font-medium text-muted-foreground">
        Bem-vindo ao fluxo de tendências
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={openModal}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Criar Post</span>
        </button>
      </div>
    </header>
  );
};

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background/90 backdrop-blur-lg flex items-center justify-around px-2 z-50">
          <Link to="/" className="p-2 text-muted-foreground hover:text-primary"><Home className="w-6 h-6" /></Link>
          <Link to="/explore" className="p-2 text-muted-foreground hover:text-primary"><Compass className="w-6 h-6" /></Link>
          <button onClick={useCreatePostStore.getState().openModal} className="p-2 bg-primary text-white rounded-full -mt-8 shadow-lg shadow-blue-500/40"><PlusCircle className="w-8 h-8" /></button>
          <Link to="/messages" className="p-2 text-muted-foreground hover:text-primary"><MessageSquare className="w-6 h-6" /></Link>
          <Link to="/profile" className="p-2 text-muted-foreground hover:text-primary"><User className="w-6 h-6" /></Link>
        </nav>
      </div>
    </div>
  );
};
