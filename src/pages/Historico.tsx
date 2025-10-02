import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  History, 
  Search, 
  Calendar,
  HandCoins,
  ArrowLeft,
  CheckCircle,
  X,
  Clock,
  Loader2,
  Filter
} from 'lucide-react';
import { Loan, Reservation } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { loansAPI, reservationsAPI } from '@/lib/api';

type ActivityType = 'loan' | 'reservation';
type Activity = {
  id: string;
  type: ActivityType;
  action: 'created' | 'completed' | 'cancelled' | 'confirmed' | 'returned';
  userName: string;
  equipmentName: string;
  date: string;
  purpose: string;
  notes?: string;
  status: string;
  details?: any;
};

export const Historico = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const allActivities: Activity[] = [];

      // Carrega empréstimos
      const loansData = await loansAPI.list();
      const loans = (loansData.results || loansData) as Loan[];
      
      loans.forEach(loan => {
        // Atividade de criação do empréstimo
        allActivities.push({
          id: `loan-created-${loan.id}`,
          type: 'loan',
          action: 'created',
          userName: loan.userName || (loan as any).user_name || 'Usuário',
          equipmentName: loan.equipmentName || (loan as any).equipment_name || 'Equipamento',
          date: loan.startDate || (loan as any).start_date || (loan as any).created_at || new Date().toISOString(),
          purpose: loan.purpose,
          notes: loan.notes,
          status: loan.status,
          details: loan
        });

        // Atividade de devolução (se concluído)
        if (loan.status === 'concluido' && loan.actualReturnDate) {
          allActivities.push({
            id: `loan-returned-${loan.id}`,
            type: 'loan',
            action: 'returned',
            userName: loan.userName || (loan as any).user_name || 'Usuário',
            equipmentName: loan.equipmentName || (loan as any).equipment_name || 'Equipamento',
            date: loan.actualReturnDate || (loan as any).actual_return_date || new Date().toISOString(),
            purpose: loan.purpose,
            notes: 'Equipamento devolvido',
            status: loan.status,
            details: loan
          });
        }

        // Atividade de cancelamento
        if (loan.status === 'cancelado') {
          allActivities.push({
            id: `loan-cancelled-${loan.id}`,
            type: 'loan',
            action: 'cancelled',
            userName: loan.userName || (loan as any).user_name || 'Usuário',
            equipmentName: loan.equipmentName || (loan as any).equipment_name || 'Equipamento',
            date: (loan as any).cancelled_at || loan.startDate || new Date().toISOString(),
            purpose: loan.purpose,
            notes: 'Empréstimo cancelado',
            status: loan.status,
            details: loan
          });
        }
      });

      // Carrega reservas
      const reservationsData = await reservationsAPI.list();
      const reservations = (reservationsData.results || reservationsData) as Reservation[];
      
      reservations.forEach(reservation => {
        // Atividade de criação da reserva
        allActivities.push({
          id: `reservation-created-${reservation.id}`,
          type: 'reservation',
          action: 'created',
          userName: reservation.userName || (reservation as any).user_name || 'Usuário',
          equipmentName: reservation.equipmentName || (reservation as any).equipment_name || 'Equipamento',
          date: reservation.reservationDate || (reservation as any).reservation_date || (reservation as any).created_at || new Date().toISOString(),
          purpose: reservation.purpose,
          notes: reservation.notes,
          status: reservation.status,
          details: reservation
        });

        // Atividade de confirmação
        if (reservation.status === 'confirmada') {
          allActivities.push({
            id: `reservation-confirmed-${reservation.id}`,
            type: 'reservation',
            action: 'confirmed',
            userName: reservation.userName || (reservation as any).user_name || 'Usuário',
            equipmentName: reservation.equipmentName || (reservation as any).equipment_name || 'Equipamento',
            date: (reservation as any).confirmed_at || reservation.reservationDate || new Date().toISOString(),
            purpose: reservation.purpose,
            notes: 'Reserva confirmada',
            status: reservation.status,
            details: reservation
          });
        }

        // Atividade de cancelamento
        if (reservation.status === 'cancelada') {
          allActivities.push({
            id: `reservation-cancelled-${reservation.id}`,
            type: 'reservation',
            action: 'cancelled',
            userName: reservation.userName || (reservation as any).user_name || 'Usuário',
            equipmentName: reservation.equipmentName || (reservation as any).equipment_name || 'Equipamento',
            date: (reservation as any).cancelled_at || reservation.reservationDate || new Date().toISOString(),
            purpose: reservation.purpose,
            notes: 'Reserva cancelada',
            status: reservation.status,
            details: reservation
          });
        }
      });

      // Ordena por data (mais recente primeiro)
      allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setActivities(allActivities);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de atividades.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canViewAllActivities = () => {
    return user?.role && ['tecnico', 'secretario', 'coordenador'].includes(user.role);
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.equipmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || activity.type === typeFilter;
    const matchesAction = actionFilter === 'all' || activity.action === actionFilter;
    
    let matchesDateRange = true;
    if (dateFrom) {
      matchesDateRange = matchesDateRange && new Date(activity.date) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDateRange = matchesDateRange && new Date(activity.date) <= new Date(dateTo);
    }

    // Filtra atividades baseado nas permissões
    const isUserActivity = canViewAllActivities() || activity.userName === user?.name;

    return matchesSearch && matchesType && matchesAction && matchesDateRange && isUserActivity;
  });

  const getActivityTypeBadge = (type: ActivityType) => {
    return type === 'loan' ? (
      <Badge className="bg-info text-info-foreground">
        <HandCoins className="w-3 h-3 mr-1" />
        Empréstimo
      </Badge>
    ) : (
      <Badge className="bg-warning text-warning-foreground">
        <Calendar className="w-3 h-3 mr-1" />
        Reserva
      </Badge>
    );
  };

  const getActivityActionBadge = (action: Activity['action']) => {
    const actionConfig = {
      created: { label: 'Criado', color: 'bg-info text-info-foreground', icon: Clock },
      completed: { label: 'Concluído', color: 'bg-success text-success-foreground', icon: CheckCircle },
      cancelled: { label: 'Cancelado', color: 'bg-destructive text-destructive-foreground', icon: X },
      confirmed: { label: 'Confirmado', color: 'bg-success text-success-foreground', icon: CheckCircle },
      returned: { label: 'Devolvido', color: 'bg-success text-success-foreground', icon: ArrowLeft }
    };

    const config = actionConfig[action];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <History className="w-8 h-8" />
          Histórico de Atividades
        </h1>
        <p className="text-muted-foreground">
          Visualize todas as atividades de empréstimos e reservas realizadas no sistema
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredActivities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Empréstimos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {filteredActivities.filter(a => a.type === 'loan').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reservas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {filteredActivities.filter(a => a.type === 'reservation').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Devoluções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {filteredActivities.filter(a => a.action === 'returned').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Use os filtros abaixo para refinar sua busca no histórico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Usuário ou equipamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="loan">Empréstimos</SelectItem>
                  <SelectItem value="reservation">Reservas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ação</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="created">Criado</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="returned">Devolvido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFrom">Período</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="De"
                />
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Até"
                />
              </div>
            </div>
          </div>

          {(searchTerm || typeFilter !== 'all' || actionFilter !== 'all' || dateFrom || dateTo) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setActionFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Atividades Registradas ({loading ? '...' : filteredActivities.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Carregando histórico...</span>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
              <p className="text-muted-foreground">
                {activities.length === 0
                  ? "Ainda não há atividades registradas no sistema."
                  : "Nenhuma atividade corresponde aos filtros aplicados."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Finalidade</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(activity.date)}
                      </TableCell>
                      <TableCell>{getActivityTypeBadge(activity.type)}</TableCell>
                      <TableCell>{getActivityActionBadge(activity.action)}</TableCell>
                      <TableCell className="font-medium">{activity.userName}</TableCell>
                      <TableCell>{activity.equipmentName}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {activity.purpose}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                        {activity.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
