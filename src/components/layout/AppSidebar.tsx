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
  Printer,
  LogOut,
  Menu
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
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ['tecnico', 'docente', 'secretario', 'coordenador'] },
  { title: "Equipamentos", url: "/equipamentos", icon: MonitorSpeaker, roles: ['tecnico', 'secretario'] },
  { title: "Empréstimos", url: "/emprestimos", icon: HandCoins, roles: ['tecnico', 'docente', 'secretario', 'coordenador'] },
  { title: "Reservas", url: "/reservas", icon: Calendar, roles: ['tecnico', 'docente', 'secretario', 'coordenador'] },
  { title: "Relatórios", url: "/relatorios", icon: FileText, roles: ['tecnico', 'coordenador'] },
  { title: "Consultar", url: "/consultar", icon: Search, roles: ['tecnico', 'docente', 'secretario', 'coordenador'] },
  { title: "Notificações", url: "/notificacoes", icon: Bell, roles: ['tecnico', 'docente', 'secretario', 'coordenador'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-primary/10";

  const filteredItems = menuItems.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <MonitorSpeaker className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-bold text-sm">SisEmprest</h2>
              <p className="text-xs text-muted-foreground">Gestão de Equipamentos</p>
            </div>
          )}
        </div>
      </SidebarHeader>

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
                      className={getNavCls}
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