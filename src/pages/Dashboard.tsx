import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  MonitorSpeaker, 
  HandCoins, 
  Wrench, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardAPI, loansAPI } from '@/lib/api';
import { useEffect, useState } from 'react';
import { DashboardStats, Loan } from '@/types';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLoans, setRecentLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Carrega estatísticas do dashboard
        const dashboardData = await dashboardAPI.stats();
        setStats(dashboardData);

        // Carrega empréstimos recentes
        const loansData = await loansAPI.list({ ordering: '-created_at', page_size: 3 });
        setRecentLoans(loansData.results || loansData);
        
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground text-destructive">
            Erro ao carregar dados. Verifique sua conexão.
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-info text-info-foreground';
      case 'atrasado': return 'bg-destructive text-destructive-foreground';
      case 'concluido': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const equipmentAvailability = (stats.availableEquipments / stats.totalEquipments) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {user?.name}! Aqui está o resumo do sistema.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Equipamentos</CardTitle>
            <MonitorSpeaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalEquipments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableEquipments} disponíveis
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empréstimos Ativos</CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stats.activeLoans}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overdueLoans} em atraso
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Manutenção</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.maintenanceEquipments}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando reparo
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Ativas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.activeReservations}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando retirada
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Disponibilidade de Equipamentos
            </CardTitle>
            <CardDescription>
              Percentual de equipamentos disponíveis para empréstimo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Disponibilidade</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(equipmentAvailability)}%
                </span>
              </div>
              <Progress value={equipmentAvailability} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{stats.availableEquipments}</div>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.loanedEquipments}</div>
                <p className="text-xs text-muted-foreground">Emprestados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Loans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Empréstimos Recentes
            </CardTitle>
            <CardDescription>
              Últimas movimentações do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLoans.length > 0 ? (
                recentLoans.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{loan.equipmentName || loan.equipment_name}</p>
                      <p className="text-xs text-muted-foreground">{loan.userName || loan.user_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(loan.status)}>
                        {loan.status}
                      </Badge>
                      {loan.status === 'atrasado' && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      {loan.status === 'concluido' && (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma movimentação recente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats.overdueLoans > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Devolução
            </CardTitle>
            <CardDescription>
              Há empréstimos em atraso que necessitam atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <strong>{stats.overdueLoans}</strong> empréstimo(s) em atraso.
              Verifique a seção de empréstimos para mais detalhes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};