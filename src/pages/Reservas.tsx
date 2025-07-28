import { useState } from 'react';
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
  Clock
} from 'lucide-react';
import { mockReservations, mockEquipments } from '@/data/mockData';
import { Reservation, ReservationStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const statusOptions: { value: ReservationStatus; label: string; color: string }[] = [
  { value: 'ativa', label: 'Ativa', color: 'bg-info text-info-foreground' },
  { value: 'confirmada', label: 'Confirmada', color: 'bg-success text-success-foreground' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-destructive text-destructive-foreground' },
  { value: 'expirada', label: 'Expirada', color: 'bg-muted text-muted-foreground' }
];

export const Reservas = () => {
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    equipmentId: '',
    expectedPickupDate: '',
    purpose: '',
    notes: ''
  });

  const availableEquipments = mockEquipments.filter(eq => 
    eq.status === 'disponivel' || eq.status === 'reservado'
  );

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = reservation.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.equipmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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

  const handleNewReservation = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedEquipment = availableEquipments.find(eq => eq.id === formData.equipmentId);
    if (!selectedEquipment || !user) return;

    const newReservation: Reservation = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      equipmentId: formData.equipmentId,
      equipmentName: `${selectedEquipment.brand} ${selectedEquipment.model}`,
      reservationDate: new Date().toISOString().split('T')[0],
      expectedPickupDate: formData.expectedPickupDate,
      status: 'ativa',
      purpose: formData.purpose,
      notes: formData.notes
    };

    setReservations(prev => [...prev, newReservation]);
    
    toast({
      title: "Reserva criada!",
      description: "Sua reserva foi registrada com sucesso.",
    });
    
    resetForm();
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

  const handleConfirmReservation = (reservation: Reservation) => {
    setReservations(prev => prev.map(r => 
      r.id === reservation.id 
        ? { ...r, status: 'confirmada' as ReservationStatus }
        : r
    ));
    
    toast({
      title: "Reserva confirmada!",
      description: "A reserva foi confirmada e está pronta para retirada.",
    });
  };

  const handleCancelReservation = (reservation: Reservation) => {
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
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
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
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-gradient-primary">
                  Criar Reserva
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
          <CardTitle>Lista de Reservas ({filteredReservations.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfirmReservation(reservation)}
                            className="bg-success text-success-foreground hover:bg-success/90"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Confirmar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelReservation(reservation)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                        </>
                      )}
                      {reservation.status === 'confirmada' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelReservation(reservation)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};