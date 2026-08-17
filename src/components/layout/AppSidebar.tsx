import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MonitorSpeaker,
  HandCoins,
  Calendar,
  FileText,
  Search,
  Bell,
  Users,
  Printer,
  LogOut,
  Menu,
  Package,
  UserPlus
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ['admin', 'tecnico', 'docente', 'secretario', 'coordenador'] },
  { title: "Equipamentos", url: "/equipamentos", icon: MonitorSpeaker, roles: ['admin', 'tecnico'] },
  { title: "Empréstimos", url: "/emprestimos", icon: HandCoins, roles: ['admin', 'tecnico', 'docente', 'secretario', 'coordenador'] },
  { title: "Pacotes", url: "/pacotes", icon: Package, roles: ['admin', 'tecnico', 'secretario', 'coordenador'] },
  { title: "Solicitações", url: "/solicitacoes", icon: FileText, roles: ['admin', 'tecnico', 'docente', 'secretario', 'coordenador'] },
  { title: "Utilizadores", url: "/utilizadores", icon: Users, roles: ['admin', 'tecnico'] },
  { title: "Relatórios", url: "/relatorios", icon: FileText, roles: ['admin', 'tecnico'] },
  { title: "Consultar", url: "/consultar", icon: Search, roles: ['admin', 'tecnico', 'docente', 'secretario', 'coordenador'] },
  { title: "Notificações", url: "/notificacoes", icon: Bell, roles: ['admin', 'tecnico', 'docente', 'secretario', 'coordenador'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  // Nao passar uma funcao ao className: o Slot do Radix (asChild) serializa-a
  // para dentro do atributo class e as classes deixam de ser aplicadas.
  const getNavCls = (active: boolean) =>
    active
      ? "!bg-primary !text-primary-foreground font-medium"
      : "!text-sidebar-foreground hover:!bg-primary/10 hover:!text-primary";

  const filteredItems = menuItems.filter(item =>
    user?.role && item.roles.includes(user.role)
  );

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarHeader className="border-b p-4">
        {collapsed ? (
          <img
            src="/logo-chama.png"
            alt="Universidade Metodista de Angola"
            className="mx-auto h-8 w-8 object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <img
              src="/logo-metodista.png"
              alt="Universidade Metodista de Angola"
              className="h-24 w-auto object-contain"
            />
            <p className="text-center text-xs font-medium text-muted-foreground">
              Gestão de Equipamentos
            </p>
          </div>
        )}
      </SidebarHeader>
      <div className="brand-stripe h-1" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed ? "Menu Principal" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={getNavCls(isActive(item.url))}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && user && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <div className="p-4 border-t">
                <div className="mb-3">
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  {user.department && (
                    <p className="text-xs text-muted-foreground">{user.department}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="w-full justify-start"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}