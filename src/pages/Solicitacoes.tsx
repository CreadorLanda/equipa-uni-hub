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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  FileText,
  CheckSquare
} from 'lucide-react';
import { LoanRequest, LoanRequestStatus, Equipment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { loanRequestsAPI, equipmentAPI } from '@/lib/api';

const statusOptions: { value: LoanRequestStatus; label: string; color: string }[] = [
  { value: 'pendente', label: 'Pendente', color: 'bg-warning text-warning-foreground' },
  { value: 'autorizado', label: 'Autorizado', color: 'bg-success text-success-foreground' },
  { value: 'rejeitado', label: 'Rejeitado', color: 'bg-destructive text-destructive-foreground' }
];

export const Solicitacoes = () => {
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [availableEquipments, setAvailableEquipments] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showConfirmPickupDialog, setShowConfirmPickupDialog] = useState(false);
  const [approvalMotivo, setApprovalMotivo] = useState('');
  const [rejectionMotivo, setRejectionMotivo] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    equipments: [] as string[],
    quantity: 6,
    purpose: '',
    expectedReturnDate: '',
    expectedReturnTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5),
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const requestsData = await loanRequestsAPI.list();
      setRequests(requestsData.results || requestsData);
      
      // Carrega equipamentos disponíveis
      const equipmentData = await equipmentAPI.available();
      setAvailableEquipments(equipmentData.results || equipmentData);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar solicitações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canCreateRequest = () => {
    return user?.role && ['tecnico', 'secretario', 'coordenador', 'docente'].includes(user.role);
  };

  const canApprove = () => {
    return user?.role === 'coordenador';
  };

  const canConfirmPickup = () => {
    return user?.role && ['tecnico', 'secretario', 'coordenador'].includes(user.role);
  };

  const filteredRequests = requests.filter(request => {
    const userName = request.userName || '';
    const purpose = request.purpose || '';
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: LoanRequestStatus) => {
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
      if (isNaN(date.getTime())) return 'Data inválida';
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return 'Data inválida';
    }
  };

  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateRequest()) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para criar solicitações.",
        variant: "destructive"
      });
      return;
    }

    if (formData.quantity <= 5) {
      toast({
        title: "Quantidade inválida",
        description: "Solicitações são para quantidades superiores a 5 equipamentos. Para quantidades menores, faça o empréstimo direto.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const newRequest = await loanRequestsAPI.create({
        user: user!.id,
        equipments: formData.equipments,
        quantity: formData.quantity,
        purpose: formData.purpose,
        expected_return_date: formData.expectedReturnDate,
        expected_return_time: formData.expectedReturnTime,
        notes: formData.notes
      });

      setRequests(prev => [newRequest, ...prev]);
      
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação foi enviada para aprovação da reitoria.",
      });
      
      resetForm();
      
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast({
        title: "Erro ao criar solicitação",
        description: "Não foi possível enviar a solicitação.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      equipments: [],
      quantity: 6,
      purpose: '',
      expectedReturnDate: '',
      expectedReturnTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5),
      notes: ''
    });
    setIsDialogOpen(false);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      await loanRequestsAPI.aprovar(selectedRequest.id, approvalMotivo);
      
      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id 
          ? { ...r, status: 'autorizado' as LoanRequestStatus }
          : r
      ));
      
      toast({
        title: "Solicitação aprovada!",
        description: "A solicitação foi aprovada com sucesso.",
      });
      
      setShowApprovalDialog(false);
      setApprovalMotivo('');
      setSelectedRequest(null);
      
    } catch (error) {
      console.error('Erro ao aprovar solicitação:', error);
      toast({
        title: "Erro ao aprovar",
        description: "Não foi possível aprovar a solicitação.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionMotivo) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await loanRequestsAPI.rejeitar(selectedRequest.id, rejectionMotivo);
      
      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id 
          ? { ...r, status: 'rejeitado' as LoanRequestStatus }
          : r
      ));
      
      toast({
        title: "Solicitação rejeitada",
        description: "A solicitação foi rejeitada.",
        variant: "destructive"
      });
      
      setShowRejectionDialog(false);
      setRejectionMotivo('');
      setSelectedRequest(null);
      
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
      toast({
        title: "Erro ao rejeitar",
        description: "Não foi possível rejeitar a solicitação.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      await loanRequestsAPI.confirmarLevantamento(selectedRequest.id, pickupNotes);
      
      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id 
          ? { ...r, confirmadoPeloTecnico: true }
          : r
      ));
      
      toast({
        title: "Levantamento confirmado!",
        description: "O levantamento dos equipamentos foi confirmado.",
      });
      
      setShowConfirmPickupDialog(false);
      setPickupNotes('');
      setSelectedRequest(null);
      
    } catch (error) {
      console.error('Erro ao confirmar levantamento:', error);
      toast({
        title: "Erro ao confirmar",
        description: "Não foi possível confirmar o levantamento.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingRequests = filteredRequests.filter(r => r.status === 'pendente');
  const authorizedRequests = filteredRequests.filter(r => r.status === 'autorizado');
  const rejectedRequests = filteredRequests.filter(r => r.status === 'rejeitado');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Solicitações de Empréstimo</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de empréstimos de grandes quantidades (acima de 5 equipamentos)
          </p>
        </div>
        
        {canCreateRequest() && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Solicitação de Empréstimo</DialogTitle>
                <DialogDescription>
                  Preencha os dados para solicitar empréstimo de múltiplos equipamentos (quantidade superior a 5).
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleNewRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade de Equipamentos</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="6"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                    required
                  />
                  <p className="text-sm text-muted-foreground">Mínimo: 6 equipamentos</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipments">Equipamentos (opcional - selecione equipamentos específicos)</Label>
                  <Select 
                    value={formData.equipments[0] || ''} 
                    onValueChange={(value) => {
                      if (!formData.equipments.includes(value)) {
                        setFormData(prev => ({ ...prev, equipments: [...prev.equipments, value] }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Adicionar equipamentos" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEquipments.map(equipment => (
                        <SelectItem key={equipment.id} value={String(equipment.id)}>
                          {equipment.brand} {equipment.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.equipments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.equipments.map(eqId => {
                        const eq = availableEquipments.find(e => String(e.id) === eqId);
                        return eq ? (
                          <Badge key={eqId} variant="secondary">
                            {eq.brand} {eq.model}
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                equipments: prev.equipments.filter(id => id !== eqId)
                              }))}
                              className="ml-2"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Finalidade da Solicitação</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Descreva o propósito da solicitação..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="expectedReturnTime">Hora Prevista</Label>
                    <Input
                      id="expectedReturnTime"
                      type="time"
                      value={formData.expectedReturnTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedReturnTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações adicionais..."
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
                        Enviando...
                      </>
                    ) : (
                      'Enviar Solicitação'
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
        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Autorizadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{authorizedRequests.length}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitadas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{rejectedRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome do usuário ou finalidade..."
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

      {/* Requests Table */}
      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="autorizadas">Autorizadas ({authorizedRequests.length})</TabsTrigger>
          <TabsTrigger value="todas">Todas ({filteredRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mr-2" />
                  <span>Carregando solicitações...</span>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma solicitação pendente</h3>
                  <p className="text-muted-foreground">
                    Não há solicitações aguardando aprovação.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Finalidade</TableHead>
                      <TableHead>Data Prevista</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(request.createdAt)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{request.quantity} equipamentos</TableCell>
                        <TableCell>
                          <p className="max-w-md truncate">{request.purpose}</p>
                        </TableCell>
                        <TableCell>{formatDate(request.expectedReturnDate)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {canApprove() && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowApprovalDialog(true);
                                }}
                                className="bg-success text-success-foreground hover:bg-success/90"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectionDialog(true);
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Rejeitar
                              </Button>
                            </div>
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

        <TabsContent value="autorizadas">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações Autorizadas</CardTitle>
            </CardHeader>
            <CardContent>
              {authorizedRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma solicitação autorizada</h3>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Data Prevista</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Levantamento</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authorizedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.userName}</TableCell>
                        <TableCell>{request.quantity} equipamentos</TableCell>
                        <TableCell>{formatDate(request.expectedReturnDate)}</TableCell>
                        <TableCell>{request.tecnicoName || '-'}</TableCell>
                        <TableCell>
                          {request.confirmadoPeloTecnico ? (
                            <Badge className="bg-success">
                              <CheckSquare className="w-3 h-3 mr-1" />
                              Confirmado
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {canConfirmPickup() && !request.confirmadoPeloTecnico && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowConfirmPickupDialog(true);
                              }}
                            >
                              <CheckSquare className="w-4 h-4 mr-1" />
                              Confirmar Levantamento
                            </Button>
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

        <TabsContent value="todas">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Solicitações</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Finalidade</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.userName}</TableCell>
                      <TableCell>{request.quantity} equipamentos</TableCell>
                      <TableCell>
                        <p className="max-w-md truncate">{request.purpose}</p>
                      </TableCell>
                      <TableCell>{formatDate(request.expectedReturnDate)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <p className="max-w-xs truncate">{request.motivoDecisao || '-'}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar esta solicitação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="approvalMotivo">Motivo/Observações (opcional)</Label>
            <Textarea
              id="approvalMotivo"
              value={approvalMotivo}
              onChange={(e) => setApprovalMotivo(e.target.value)}
              placeholder="Adicione observações sobre a aprovação..."
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove}
              disabled={submitting}
              className="bg-success hover:bg-success/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                'Aprovar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Dialog */}
      <AlertDialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, informe o motivo da rejeição.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="rejectionMotivo">Motivo da Rejeição *</Label>
            <Textarea
              id="rejectionMotivo"
              value={rejectionMotivo}
              onChange={(e) => setRejectionMotivo(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
              required
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              disabled={submitting || !rejectionMotivo}
              className="bg-destructive hover:bg-destructive/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                'Rejeitar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Pickup Dialog */}
      <AlertDialog open={showConfirmPickupDialog} onOpenChange={setShowConfirmPickupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Levantamento</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme que o utente levantou os equipamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="pickupNotes">Observações (opcional)</Label>
            <Textarea
              id="pickupNotes"
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
              placeholder="Adicione observações sobre o levantamento..."
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmPickup}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
