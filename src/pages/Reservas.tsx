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
import { 
  Plus, 
  Search, 
  Calendar,
  X,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { Reservation, ReservationStatus, Equipment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { reservationsAPI, equipmentAPI } from '@/lib/api';

const statusOptions: { value: ReservationStatus; label: string; color: string }[] = [
  { value: 'ativa', label: 'Ativa', color: 'bg-info text-info-foreground' },
  { value: 'confirmada', label: 'Confirmada', color: 'bg-success text-success-foreground' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-destructive text-destructive-foreground' },
  { value: 'expirada', label: 'Expirada', color: 'bg-muted text-muted-foreground' }
];

export const Reservas = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [availableEquipments, setAvailableEquipments] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    equipmentId: '',
    expectedPickupDate: '',
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
      
      // Carrega reservas
      const reservationsData = await reservationsAPI.list();
      setReservations(reservationsData.results || reservationsData);
      
      // Carrega equipamentos disponíveis
      const equipmentData = await equipmentAPI.available();
      setAvailableEquipments(equipmentData.results || equipmentData);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar reservas e equipamentos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificações de permissão
  const canCreateReservation = () => {
    return user?.role && ['docente', 'tecnico', 'secretario', 'coordenador'].includes(user.role);
  };

  const canConfirmReservation = () => {
    return user?.role && ['tecnico', 'secretario', 'coordenador'].includes(user.role);
  };

  const canCancelReservation = (reservation: Reservation) => {
    // Usuário pode cancelar suas próprias reservas ou se for técnico/secretário/coordenador
    return reservation.userId === user?.id || 
           (user?.role && ['tecnico', 'secretario', 'coordenador'].includes(user.role));
  };

  const canViewAllReservations = () => {
    return user?.role && ['tecnico', 'secretario', 'coordenador'].includes(user.role);
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = (reservation.userName || reservation.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (reservation.equipmentName || reservation.equipment_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    
    // Filtra reservas baseado nas permissões
    if (canViewAllReservations()) {
      return matchesSearch && matchesStatus; // Técnico/secretário/coordenador vê todas
    } else {
      // Docentes só veem próprias reservas
      return matchesSearch && matchesStatus && reservation.userId === user?.id;
    }
  });

  const getStatusBadge = (status: ReservationStatus) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color}>
        {statusConfig?.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleNewReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateReservation()) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para criar reservas.",
        variant: "destructive"
      });
      return;
    }
    
    const selectedEquipment = availableEquipments.find(eq => eq.id === formData.equipmentId);
    if (!selectedEquipment || !user) return;

    setSubmitting(true);
    
    try {
      const newReservation = await reservationsAPI.create({
        user: user.id,
        equipment: formData.equipmentId,
        expected_pickup_date: formData.expectedPickupDate,
        purpose: formData.purpose,
        notes: formData.notes
      });

      setReservations(prev => [...prev, newReservation]);
      
      toast({
        title: "Reserva criada!",
        description: "Sua reserva foi registrada com sucesso.",
      });
      
      resetForm();
      
      // Recarrega equipamentos disponíveis
      const equipmentData = await equipmentAPI.available();
      setAvailableEquipments(equipmentData.results || equipmentData);
      
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      toast({
        title: "Erro ao criar reserva",
        description: "Não foi possível registrar a reserva.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      equipmentId: '',
      expectedPickupDate: '',
      purpose: '',
      notes: ''
    });
    setIsDialogOpen(false);
  };

  const handleConfirmReservation = async (reservation: Reservation) => {
    if (!canConfirmReservation()) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para confirmar reservas.",
        variant: "destructive"
      });
      return;
    }

    try {
      await reservationsAPI.confirm(reservation.id, {
        confirmed_at: new Date().toISOString()
      });
      
      setReservations(prev => prev.map(r => 
        r.id === reservation.id 
          ? { ...r, status: 'confirmada' as ReservationStatus }
          : r
      ));
      
      toast({
        title: "Reserva confirmada!",
        description: "A reserva foi confirmada e está pronta para retirada.",
      });
      
    } catch (error) {
      console.error('Erro ao confirmar reserva:', error);
      toast({
        title: "Erro ao confirmar reserva",
        description: "Não foi possível confirmar a reserva.",
        variant: "destructive"
      });
    }
  };

  const handleCancelReservation = async (reservation: Reservation) => {
    if (!canCancelReservation(reservation)) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para cancelar esta reserva.",
        variant: "destructive"
      });
      return;
    }

    try {
      await reservationsAPI.cancel(reservation.id, {
        reason: 'Cancelada pelo usuário'
      });
      
      setReservations(prev => prev.map(r => 
        r.id === reservation.id 
          ? { ...r, status: 'cancelada' as ReservationStatus }
          : r
      ));
      
      toast({
        title: "Reserva cancelada!",
        description: "A reserva foi cancelada com sucesso.",
        variant: "destructive"
      });
      
      // Recarrega equipamentos disponíveis
      const equipmentData = await equipmentAPI.available();
      setAvailableEquipments(equipmentData.results || equipmentData);
      
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error);
      toast({
        title: "Erro ao cancelar reserva",
        description: "Não foi possível cancelar a reserva.",
        variant: "destructive"
      });
    }
  };

  const activeReservations = filteredReservations.filter(r => r.status === 'ativa');
  const confirmedReservations = filteredReservations.filter(r => r.status === 'confirmada');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gestão de Reservas</h1>
          <p className="text-muted-foreground">
            Gerencie reservas de equipamentos para retirada futura
          </p>
        </div>
        
        {canCreateReservation() && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Reserva
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Reserva</DialogTitle>
              <DialogDescription>
                Preencha os dados da reserva abaixo.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleNewReservation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="equipment">Equipamento</Label>
                <Select 
                  value={formData.equipmentId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, equipmentId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEquipments.map(equipment => (
                      <SelectItem key={equipment.id} value={equipment.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{equipment.brand} {equipment.model} - {equipment.serialNumber}</span>
                          <Badge variant="outline" className="ml-2">
                            {equipment.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedPickupDate">Data Prevista para Retirada</Label>
                <Input
                  id="expectedPickupDate"
                  type="date"
                  value={formData.expectedPickupDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedPickupDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Finalidade da Reserva</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="Descreva o propósito da reserva..."
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
                      Criando...
                    </>
                  ) : (
                    'Criar Reserva'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-info">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Ativas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{activeReservations.length}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{confirmedReservations.length}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Reservas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{filteredReservations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar reservas específicas
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

      {/* Reservations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Reservas ({loading ? '...' : filteredReservations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Carregando reservas...</span>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhuma reserva encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {reservations.length === 0 
                  ? "Ainda não há reservas cadastradas no sistema."
                  : "Nenhuma reserva corresponde aos filtros aplicados."}
              </p>
              {canCreateReservation() && reservations.length === 0 && (
                <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Reserva
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Data da Reserva</TableHead>
                  <TableHead>Data de Retirada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{reservation.userName}</p>
                      <p className="text-sm text-muted-foreground">{reservation.purpose}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{reservation.equipmentName}</p>
                  </TableCell>
                  <TableCell>{formatDate(reservation.reservationDate)}</TableCell>
                  <TableCell>{formatDate(reservation.expectedPickupDate)}</TableCell>
                  <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {reservation.status === 'ativa' && (
                        <>
                          {canConfirmReservation() && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfirmReservation(reservation)}
                              className="bg-success text-success-foreground hover:bg-success/90"
                              title="Confirmar reserva"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Confirmar
                            </Button>
                          )}
                          {canCancelReservation(reservation) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelReservation(reservation)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              title="Cancelar reserva"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                          )}
                          {!canConfirmReservation() && !canCancelReservation(reservation) && (
                            <span className="text-sm text-muted-foreground italic">
                              Sem permissões
                            </span>
                          )}
                        </>
                      )}
                      {reservation.status === 'confirmada' && canCancelReservation(reservation) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelReservation(reservation)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          title="Cancelar reserva confirmada"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      )}
                      {(reservation.status === 'cancelada' || reservation.status === 'expirada') && (
                        <span className="text-sm text-muted-foreground italic">
                          {reservation.status === 'cancelada' ? 'Cancelada' : 'Expirada'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};