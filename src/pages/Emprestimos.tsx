import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  HandCoins,
  ArrowLeft,
  Printer,
  Loader2,
  Info,
  Eye
} from 'lucide-react';
import { Loan, LoanStatus, Equipment, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { loansAPI, equipmentAPI, usersAPI } from '@/lib/api';

const statusOptions: { value: LoanStatus; label: string; color: string }[] = [
  { value: 'pendente', label: 'Pendente Levantamento', color: 'bg-warning text-warning-foreground' },
  { value: 'ativo', label: 'Ativo', color: 'bg-info text-info-foreground' },
  { value: 'atrasado', label: 'Atrasado', color: 'bg-destructive text-destructive-foreground' },
  { value: 'concluido', label: 'Concluído', color: 'bg-success text-success-foreground' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-muted text-muted-foreground' }
];

export const Emprestimos = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [availableEquipments, setAvailableEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showEquipmentDetailsDialog, setShowEquipmentDetailsDialog] = useState(false);
  const [showConfirmPickupDialog, setShowConfirmPickupDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedEquipmentDetails, setSelectedEquipmentDetails] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmPickupNotes, setConfirmPickupNotes] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  // Debug logs
  console.log('=== EMPRESTIMOS PAGE DEBUG ===');
  console.log('User:', user);
  console.log('Loans count:', loans.length);
  console.log('Available equipments count:', availableEquipments.length);
  console.log('Loading:', loading);

  const [formData, setFormData] = useState({
    userId: 'self',
    equipmentId: '',
    expectedReturnDate: '',
    expectedReturnTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5),
    purpose: '',
    notes: ''
  });

  // Carrega dados da API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log('Carregando dados de empréstimos...');
      
      // Carrega empréstimos
      const loansData = await loansAPI.list();
      console.log('Loans data received:', loansData);
      setLoans(loansData.results || loansData);
      
      // Carrega equipamentos disponíveis
      const equipmentData = await equipmentAPI.available();
      console.log('Equipment data received:', equipmentData);
      setAvailableEquipments(equipmentData.results || equipmentData);
      
      // Carrega usuários (para técnicos selecionarem)
      if (canCreateLoan()) {
        const usersData = await usersAPI.list();
        setUsers(usersData.results || usersData);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar empréstimos e equipamentos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificações de permissão
  const canCreateLoan = () => {
    // APENAS técnico pode criar empréstimos diretos
    // Docentes/secretários devem usar solicitações ou reservas
    return user?.role === 'tecnico';
  };

  const canReturnLoan = (loan: Loan) => {
    // Apenas técnico/secretário/coordenador podem devolver
    return user?.role && ['tecnico', 'secretario', 'coordenador'].includes(user.role);
  };

  const canConfirmPickup = () => {
    // Apenas técnico/secretário/coordenador podem confirmar levantamento
    return user?.role && ['tecnico', 'secretario', 'coordenador'].includes(user.role);
  };

  const canViewAllLoans = () => {
    return user?.role && ['tecnico', 'secretario', 'coordenador'].includes(user.role);
  };

  const filteredLoans = loans.filter(loan => {
    const userName = loan.userName || loan.user_name || '';
    const equipmentName = loan.equipmentName || loan.equipment_name || '';
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    
    console.log('Filtering loan:', {
      loanId: loan.id,
      userName,
      equipmentName,
      userId: loan.userId,
      currentUser: user?.id,
      matchesSearch,
      matchesStatus
    });
    
    // Filtra empréstimos baseado nas permissões
    if (canViewAllLoans()) {
      return matchesSearch && matchesStatus; // Técnico/secretário/coordenador vê todos
    } else {
      // Docentes só veem próprios empréstimos
      return matchesSearch && matchesStatus && loan.userId === user?.id;
    }
  });

  const getStatusBadge = (status: LoanStatus) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color}>
        {statusConfig?.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Data inválida';
      }
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return 'Data inválida';
    }
  };

  const isOverdue = (loan: Loan) => {
    if (loan.status === 'concluido' || loan.status === 'cancelado') return false;
    // Considera hora prevista se existir
    const dateStr = (loan.expectedReturnDate || (loan as any).expected_return_date);
    if (!dateStr) return false;
    const timeStr = (loan.expectedReturnTime || (loan as any).expected_return_time || '23:59');
    const iso = `${dateStr}T${timeStr}:00`;
    return new Date(iso) < new Date();
  };

  const handleNewLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateLoan()) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para criar empréstimos.",
        variant: "destructive"
      });
      return;
    }
    
    const selectedEquipment = availableEquipments.find(eq => String(eq.id) === String(formData.equipmentId));
    if (!selectedEquipment || !user) return;

    // Determina o usuário do empréstimo
    const loanUserId = (formData.userId && formData.userId !== 'self') ? formData.userId : user.id;

    // Verifica se o usuário tem empréstimos atrasados
    const userOverdueLoans = loans.filter(loan => {
      const isUserLoan = (loan.userId || (loan as any).user) === loanUserId;
      return isUserLoan && isOverdue(loan);
    });

    if (userOverdueLoans.length > 0) {
      const targetUser = users.find(u => String(u.id) === String(loanUserId)) || user;
      toast({
        title: "Empréstimo bloqueado",
        description: `${targetUser?.name || 'Este utente'} possui ${userOverdueLoans.length} empréstimo(s) atrasado(s). É necessário devolver os equipamentos pendentes antes de solicitar um novo empréstimo.`,
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const newLoan = await loansAPI.create({
        user: loanUserId,
        equipment: selectedEquipment.id,
        expected_return_date: formData.expectedReturnDate,
        expected_return_time: formData.expectedReturnTime,
        purpose: formData.purpose,
        notes: formData.notes
      });

      setLoans(prev => [...prev, newLoan]);
      
      toast({
        title: "Empréstimo registrado!",
        description: "O empréstimo foi criado com sucesso.",
      });
      
      resetForm();
      setSelectedLoan(newLoan);
      setShowTicketDialog(true);
      
      // Recarrega equipamentos disponíveis
      const equipmentData = await equipmentAPI.available();
      setAvailableEquipments(equipmentData.results || equipmentData);
      
    } catch (error) {
      console.error('Erro ao criar empréstimo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      let description = "Não foi possível registrar o empréstimo.";
      const equipmentUnavailable = errorMessage.includes('equipamento não está disponível') || 
                                   errorMessage.includes('not available') ||
                                   errorMessage.includes('unavailable');
      
      if (errorMessage.includes('Data de devolução deve ser posterior')) {
        description = "A data de devolução deve ser posterior à data de hoje.";
      } else if (equipmentUnavailable) {
        description = "O equipamento selecionado não está disponível no momento. Que tal criar uma reserva? Você será notificado quando o equipamento estiver disponível.";
        
        // Show special toast with action button
        toast({
          title: "Equipamento Indisponível",
          description,
          variant: "default",
          action: (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                window.location.href = '/reservas';
              }}
            >
              Criar Reserva
            </Button>
          ),
        });
        setSubmitting(false);
        return;
      } else if (errorMessage.includes('400')) {
        description = "Dados inválidos. Verifique se todos os campos estão preenchidos corretamente.";
      }
      
      toast({
        title: "Erro ao criar empréstimo",
        description,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: 'self',
      equipmentId: '',
      expectedReturnDate: '',
      expectedReturnTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5),
      purpose: '',
      notes: ''
    });
    setIsDialogOpen(false);
  };

  const handleViewEquipmentDetails = async (equipmentId: string) => {
    try {
      const equipment = await equipmentAPI.get(equipmentId);
      setSelectedEquipmentDetails(equipment);
      setShowEquipmentDetailsDialog(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes do equipamento:', error);
      toast({
        title: "Erro ao carregar detalhes",
        description: "Não foi possível carregar os detalhes do equipamento.",
        variant: "destructive"
      });
    }
  };

  const handleReturn = async (loan: Loan) => {
    if (!canReturnLoan(loan)) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para devolver este empréstimo.",
        variant: "destructive"
      });
      return;
    }

    try {
      await loansAPI.returnEquipment(loan.id, {
        return_date: new Date().toISOString().split('T')[0],
        notes: 'Devolvido via sistema'
      });
      
      setLoans(prev => prev.map(l => 
        l.id === loan.id 
          ? { 
              ...l, 
              status: 'concluido' as LoanStatus,
              actualReturnDate: new Date().toISOString().split('T')[0]
            }
          : l
      ));
      
      toast({
        title: "Devolução confirmada!",
        description: "O equipamento foi devolvido com sucesso.",
      });
      
      // Recarrega equipamentos disponíveis
      const equipmentData = await equipmentAPI.available();
      setAvailableEquipments(equipmentData.results || equipmentData);
      
    } catch (error) {
      console.error('Erro ao devolver equipamento:', error);
      toast({
        title: "Erro na devolução",
        description: "Não foi possível processar a devolução.",
        variant: "destructive"
      });
    }
  };

  const handleConfirmPickup = async (loan: Loan) => {
    if (!canConfirmPickup()) {
      toast({
        title: "Acesso negado",
        description: "Apenas técnicos podem confirmar levantamentos.",
        variant: "destructive"
      });
      return;
    }

    setSelectedLoan(loan);
    setShowConfirmPickupDialog(true);
  };

  const confirmPickup = async () => {
    if (!selectedLoan) return;

    setSubmitting(true);
    try {
      const updatedLoan = await loansAPI.confirmarLevantamento(selectedLoan.id, {
        notes: confirmPickupNotes
      });
      
      setLoans(prev => prev.map(l => 
        l.id === selectedLoan.id 
          ? { ...l, status: 'ativo' as LoanStatus }
          : l
      ));
      
      toast({
        title: "Levantamento confirmado!",
        description: `O empréstimo foi ativado com sucesso. O equipamento agora está emprestado para ${selectedLoan.userName || selectedLoan.user_name}.`,
      });
      
      setShowConfirmPickupDialog(false);
      setSelectedLoan(null);
      setConfirmPickupNotes('');
      
      // Recarrega lista para atualizar status
      await loadData();
      
    } catch (error) {
      console.error('Erro ao confirmar levantamento:', error);
      toast({
        title: "Erro ao confirmar levantamento",
        description: "Não foi possível confirmar o levantamento do equipamento.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingLoans = filteredLoans.filter(loan => loan.status === 'pendente');
  const activeLoans = filteredLoans.filter(loan => loan.status === 'ativo' || loan.status === 'atrasado');
  const completedLoans = filteredLoans.filter(loan => loan.status === 'concluido');
  const overdueLoans = filteredLoans.filter(loan => isOverdue(loan));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gestão de Empréstimos</h1>
          <p className="text-muted-foreground">
            Gerencie empréstimos e devoluções de equipamentos
          </p>
        </div>
        
        {canCreateLoan() && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Empréstimo
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Novo Empréstimo</DialogTitle>
              <DialogDescription>
                Preencha os dados do empréstimo abaixo.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleNewLoan} className="space-y-4">
              {/* Campo de seleção de usuário (apenas para técnicos) */}
              {canCreateLoan() && users.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="user">Empréstimo para Utente</Label>
                  <Select 
                    value={formData.userId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, userId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um utente (ou deixe vazio para você)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">
                        <span className="italic">Meu próprio empréstimo</span>
                      </SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name} - {u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="equipment">Equipamento</Label>
                <Select 
                  value={formData.equipmentId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, equipmentId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um equipamento disponível" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEquipments.map(equipment => (
                      <SelectItem key={equipment.id} value={String(equipment.id)}>
                        {equipment.brand} {equipment.model} - {(equipment as any).serialNumber || (equipment as any).serial_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedReturnDate">Data Prevista de Devolução</Label>
                <Input
                  id="expectedReturnDate"
                  type="date"
                  value={formData.expectedReturnDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedReturnDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedReturnTime">Hora Prevista de Devolução</Label>
                <Input
                  id="expectedReturnTime"
                  type="time"
                  value={formData.expectedReturnTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedReturnTime: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Finalidade do Empréstimo</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="Descreva o propósito do empréstimo..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações adicionais (opcional)..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Registrar Empréstimo'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente Confirmação</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingLoans.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-info">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empréstimos Ativos</CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{activeLoans.length}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueLoans.length}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{completedLoans.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar empréstimos específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome do usuário ou equipamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loans Table */}
      <Tabs defaultValue={pendingLoans.length > 0 ? "pendentes" : "ativos"} className="space-y-4">
        <TabsList>
          {pendingLoans.length > 0 && (
            <TabsTrigger value="pendentes">Aguardando Confirmação ({pendingLoans.length})</TabsTrigger>
          )}
          <TabsTrigger value="ativos">Ativos ({activeLoans.length})</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos ({completedLoans.length})</TabsTrigger>
          <TabsTrigger value="todos">Todos ({filteredLoans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          <Card>
            <CardHeader>
              <CardTitle>Empréstimos Aguardando Confirmação</CardTitle>
              <CardDescription>
                Empréstimos que foram registrados mas ainda não foram levantados pelos utentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mr-2" />
                  <span>Carregando empréstimos...</span>
                </div>
              ) : pendingLoans.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Nenhum empréstimo pendente</h3>
                  <p className="text-muted-foreground">
                    Todos os empréstimos foram confirmados.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Data/Hora de Início</TableHead>
                      <TableHead>Data/Hora Prevista</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLoans.map((loan) => (
                      <TableRow key={loan.id} className="bg-warning/10">
                        <TableCell>
                          <div>
                            <p className="font-medium">{loan.userName || loan.user_name}</p>
                            <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{loan.equipmentName || loan.equipment_name}</p>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatDate(loan.startDate || loan.start_date)}</p>
                            <p className="text-sm text-muted-foreground">
                              {(loan.startTime || loan.start_time) ? (loan.startTime || loan.start_time) : 'Hora não definida'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>
                              {formatDate(loan.expectedReturnDate || (loan as any).expected_return_date)}
                              {(loan.expectedReturnTime || (loan as any).expected_return_time) && (
                                <span className="text-sm text-muted-foreground"> {loan.expectedReturnTime || (loan as any).expected_return_time}</span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(loan.status)}
                        </TableCell>
                        <TableCell>
                          {canConfirmPickup() ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfirmPickup(loan)}
                              className="bg-warning text-warning-foreground hover:bg-warning/90"
                              title="Confirmar que o utente levantou o equipamento"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Confirmar Levantamento
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              Aguardando confirmação do técnico
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ativos">
          <Card>
            <CardHeader>
              <CardTitle>Empréstimos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mr-2" />
                  <span>Carregando empréstimos...</span>
                </div>
              ) : activeLoans.length === 0 ? (
                <div className="text-center py-12">
                  <HandCoins className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Nenhum empréstimo ativo</h3>
                  <p className="text-muted-foreground mb-4">
                    Não há empréstimos ativos no momento.
                  </p>
                  {canCreateLoan() && (
                    <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiro Empréstimo
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Data/Hora de Início</TableHead>
                      <TableHead>Data/Hora Prevista</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeLoans.map((loan) => (
                    <TableRow key={loan.id} className={isOverdue(loan) ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.userName || loan.user_name}</p>
                          <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{loan.equipmentName || loan.equipment_name}</p>
                          {!canViewAllLoans() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewEquipmentDetails(loan.equipmentId || (loan as any).equipment)}
                              title="Ver detalhes do equipamento"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatDate(loan.startDate || loan.start_date)}</p>
                          <p className="text-sm text-muted-foreground">
                            {(loan.startTime || loan.start_time) ? (loan.startTime || loan.start_time) : 'Hora não definida'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>
                            {formatDate(loan.expectedReturnDate || (loan as any).expected_return_date)}
                            {(loan.expectedReturnTime || (loan as any).expected_return_time) && (
                              <span className="text-sm text-muted-foreground"> {loan.expectedReturnTime || (loan as any).expected_return_time}</span>
                            )}
                          </span>
                          {isOverdue(loan) && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(isOverdue(loan) ? 'atrasado' : loan.status)}
                      </TableCell>
                      <TableCell>
                        {canReturnLoan(loan) && (loan.status === 'ativo' || loan.status === 'atrasado') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReturn(loan)}
                            className="bg-success text-success-foreground hover:bg-success/90"
                            title="Confirmar devolução"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Devolver
                          </Button>
                        )}
                        {(!canReturnLoan(loan) || (loan.status !== 'ativo' && loan.status !== 'atrasado')) && (
                          <span className="text-sm text-muted-foreground italic">
                            {loan.status === 'concluido' ? 'Devolvido' : 
                             loan.status === 'cancelado' ? 'Cancelado' : 'Sem permissão'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="concluidos">
          <Card>
            <CardHeader>
              <CardTitle>Empréstimos Concluídos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mr-2" />
                  <span>Carregando empréstimos...</span>
                </div>
              ) : completedLoans.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Nenhum empréstimo concluído</h3>
                  <p className="text-muted-foreground">
                    Não há empréstimos concluídos para exibir.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Data/Hora de Início</TableHead>
                      <TableHead>Data de Devolução</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.userName || loan.user_name}</p>
                          <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{loan.equipmentName || loan.equipment_name}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatDate(loan.startDate || loan.start_date)}</p>
                          <p className="text-sm text-muted-foreground">
                            {(loan.startTime || loan.start_time) ? (loan.startTime || loan.start_time) : 'Hora não definida'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(loan.actualReturnDate || loan.actual_return_date)}
                      </TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Empréstimos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Data/Hora de Início</TableHead>
                    <TableHead>Data/Hora Prevista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.userName || loan.user_name}</p>
                          <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{loan.equipmentName || loan.equipment_name}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatDate(loan.startDate || loan.start_date)}</p>
                          <p className="text-sm text-muted-foreground">
                            {(loan.startTime || loan.start_time) ? (loan.startTime || loan.start_time) : 'Hora não definida'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(loan.expectedReturnDate || (loan as any).expected_return_date)}
                        {(loan.expectedReturnTime || (loan as any).expected_return_time) && (
                          <span className="text-sm text-muted-foreground"> {loan.expectedReturnTime || (loan as any).expected_return_time}</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      <TableCell>
                        {canReturnLoan(loan) && (loan.status === 'ativo' || loan.status === 'atrasado') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReturn(loan)}
                            className="bg-success text-success-foreground hover:bg-success/90"
                            title="Confirmar devolução"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Devolver
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Equipment Details Dialog */}
      <Dialog open={showEquipmentDetailsDialog} onOpenChange={setShowEquipmentDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Detalhes do Equipamento
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre o equipamento emprestado
            </DialogDescription>
          </DialogHeader>
          
          {selectedEquipmentDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Marca</Label>
                  <p className="text-lg font-medium mt-1">{selectedEquipmentDetails.brand}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Modelo</Label>
                  <p className="text-lg font-medium mt-1">{selectedEquipmentDetails.model}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Tipo</Label>
                  <p className="text-lg font-medium mt-1 capitalize">{selectedEquipmentDetails.type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Número de Série</Label>
                  <p className="text-lg font-medium mt-1 font-mono">
                    {selectedEquipmentDetails.serialNumber || (selectedEquipmentDetails as any).serial_number}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Status</Label>
                  <div className="mt-1">
                    <Badge>{selectedEquipmentDetails.status}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Data de Aquisição</Label>
                  <p className="text-lg font-medium mt-1">
                    {formatDate(selectedEquipmentDetails.acquisitionDate || (selectedEquipmentDetails as any).acquisition_date)}
                  </p>
                </div>
              </div>

              {selectedEquipmentDetails.location && (
                <div>
                  <Label className="text-muted-foreground text-sm">Localização</Label>
                  <p className="text-lg font-medium mt-1">{selectedEquipmentDetails.location}</p>
                </div>
              )}

              {selectedEquipmentDetails.description && (
                <div>
                  <Label className="text-muted-foreground text-sm">Descrição</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                    {selectedEquipmentDetails.description}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEquipmentDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comprovante de Empréstimo</DialogTitle>
            <DialogDescription>
              Comprovante gerado com sucesso!
            </DialogDescription>
          </DialogHeader>
          
          {selectedLoan && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted">
              <div className="text-center">
                <h3 className="font-bold">Sistema de Empréstimos</h3>
                <p className="text-sm text-muted-foreground">Universidade Metodista de Angola</p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Empréstimo:</span>
                  <span className="font-mono">#{selectedLoan.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usuário:</span>
                  <span>{selectedLoan.userName || selectedLoan.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Equipamento:</span>
                  <span>{selectedLoan.equipmentName || selectedLoan.equipment_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data de Início:</span>
                  <span>{formatDate(selectedLoan.startDate || selectedLoan.start_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hora de Devolução:</span>
                  <span>{(selectedLoan.expectedReturnTime || (selectedLoan as any).expected_return_time) ? (selectedLoan.expectedReturnTime || (selectedLoan as any).expected_return_time) : 'Hora não definida'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data de Devolução:</span>
                  <span>{formatDate(selectedLoan.expectedReturnDate || selectedLoan.expected_return_date)}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Pickup Dialog */}
      <Dialog open={showConfirmPickupDialog} onOpenChange={setShowConfirmPickupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-warning" />
              Confirmar Levantamento de Equipamento
            </DialogTitle>
            <DialogDescription>
              Confirme que o utente levantou o equipamento. O empréstimo passará de "Pendente" para "Ativo".
            </DialogDescription>
          </DialogHeader>
          
          {selectedLoan && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Utente:</span>
                  <span className="font-medium">{selectedLoan.userName || selectedLoan.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Equipamento:</span>
                  <span className="font-medium">{selectedLoan.equipmentName || selectedLoan.equipment_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Devolução prevista:</span>
                  <span className="font-medium">
                    {formatDate(selectedLoan.expectedReturnDate || (selectedLoan as any).expected_return_date)}
                    {(selectedLoan.expectedReturnTime || (selectedLoan as any).expected_return_time) && 
                      ` às ${selectedLoan.expectedReturnTime || (selectedLoan as any).expected_return_time}`}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNotes">Observações (opcional)</Label>
                <Textarea
                  id="confirmNotes"
                  placeholder="Adicione observações sobre o estado do equipamento ou condições do levantamento..."
                  value={confirmPickupNotes}
                  onChange={(e) => setConfirmPickupNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowConfirmPickupDialog(false);
                setSelectedLoan(null);
                setConfirmPickupNotes('');
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmPickup}
              disabled={submitting}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Levantamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
