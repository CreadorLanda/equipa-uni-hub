import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Equipamentos } from "@/pages/Equipamentos";
import { Emprestimos } from "@/pages/Emprestimos";
import { Reservas } from "@/pages/Reservas";
import { Relatorios } from "@/pages/Relatorios";
import { Consultar } from "@/pages/Consultar";
import { Notificacoes } from "@/pages/Notificacoes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/equipamentos" element={
              <ProtectedRoute allowedRoles={['tecnico']}>
                <Equipamentos />
              </ProtectedRoute>
            } />
            <Route path="/emprestimos" element={
              <ProtectedRoute>
                <Emprestimos />
              </ProtectedRoute>
            } />
            <Route path="/reservas" element={
              <ProtectedRoute>
                <Reservas />
              </ProtectedRoute>
            } />
            <Route path="/relatorios" element={
              <ProtectedRoute allowedRoles={['tecnico']}>
                <Relatorios />
              </ProtectedRoute>
            } />
            <Route path="/consultar" element={
              <ProtectedRoute>
                <Consultar />
              </ProtectedRoute>
            } />
            <Route path="/notificacoes" element={
              <ProtectedRoute>
                <Notificacoes />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
