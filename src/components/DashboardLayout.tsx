import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  DollarSign,
  FileText,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/leads", label: "Leads", icon: UserPlus },
  { to: "/dashboard/pacientes", label: "Pacientes", icon: Users },
  { to: "/dashboard/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/dashboard/conteudo", label: "Conteúdo", icon: FileText },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/leads": "Leads",
  "/dashboard/pacientes": "Pacientes",
  "/dashboard/financeiro": "Financeiro",
  "/dashboard/conteudo": "Conteúdo",
};

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6 border-b border-border-soft">
        <h1 className="text-[18px] font-bold text-primary leading-tight">NutriDash</h1>
        <p className="text-xs text-muted-foreground mt-1">Dra. Ana Souza</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors duration-150 ${
                isActive
                  ? "bg-surface-2 text-foreground font-medium before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-primary before:rounded-r"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border-soft">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-md text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors duration-150"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};

export const DashboardLayout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentTitle = pageTitles[location.pathname] ?? "";

  return (
    <div className="flex h-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-60 shrink-0 bg-surface border-r border-border-soft">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-60 h-full bg-surface border-r border-border-soft">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-border-soft bg-background/70 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-medium">{currentTitle}</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
            AS
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
