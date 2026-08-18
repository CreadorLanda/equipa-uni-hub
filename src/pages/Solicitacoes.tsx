import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  CheckSquare,
  Paperclip,
  PackagePlus,
  QrCode,
  Trash2
} from 'lucide-react';
import { LoanRequest, LoanRequestStatus, Equipment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { loanRequestsAPI, equipmentAPI, packagesAPI } from '@/lib/api';

const statusOptions: { value: LoanRequestStatus; label: string; color: string }[] = [
  { value: 'pendente', label: 'Em análise', color: 'bg-warning text-warning-foreground' },
  // RF18: aprovada = pronta para levantamento (nomenclatura do relatorio)
  { value: 'autorizado', label: 'Em levantamento', color: 'bg-success text-success-foreground' },
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
  // RF17 - documento validado pela Reitoria, anexado ao aprovar/rejeitar
  const [decisionDoc, setDecisionDoc] = useState<File | null>(null);
  // RF30 - atribuicao de equipamentos a uma solicitacao autorizada
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [assignSelected, setAssignSelected] = useState<number[]>([]);
  const [assignQr, setAssignQr] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  const [pickupNotes, setPickupNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeHash, setQrCodeHash] = useState('');
  const [qrRequestId, setQrRequestId] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    equipments: [] as string[],
    pacote: '',
    quantity: 2,
    purpose: '',
    expectedReturnDate: '',
    expectedReturnTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5),
    notes: '',
    devolucao_mesmo_dia: false,
  });
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const requestsData = await loanRequestsAPI.list();
      setRequests(requestsData.results || requestsData);
      
      const equipmentData = await equipmentAPI.available();
      setAvailableEquipments(equipmentData.results || equipmentData);

      const pkgs = await packagesAPI.available();
      setAvailablePackages(Array.isArray(pkgs) ? pkgs : (pkgs as any).results || []);
      
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
    return user?.role && ['admin', 'tecnico', 'secretario', 'coordenador', 'docente'].includes(user.role);
  };

  const canApprove = () => {
    return user?.role && ['admin', 'tecnico', 'coordenador'].includes(user.role);
  };

  // RF30 - so admin e tecnico atribuem equipamentos
  const canAssign = () => user?.role === 'admin' || user?.role === 'tecnico';

  const emFalta = (r: any) =>
    typeof r?.equipamentos_em_falta === 'number' ? r.equipamentos_em_falta : 0;

  const canConfirmPickup = () => {
    return user?.role && ['admin', 'tecnico', 'secretario', 'coordenador'].includes(user.role);
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

  const getUserName = (r: any) => r.user_name || r.userName || r.user?.name || '-';

  // RF17/RN02 - solicitacao especial (por quantidade) so avanca com o despacho
  // da Reitoria anexado; nas normais o documento e opcional.
  const isSpecial = (r: any) => !!(r?.is_special || (r?.quantity && r.quantity > 0));
  const getDocUrl = (r: any) => r?.documento_url || null;
  const hasDoc = (r: any) => !!(r?.documento_url || r?.tem_documento);

  const renderDocCell = (r: any) => (
    <TableCell>
      {hasDoc(r) && getDocUrl(r) ? (
        <a
          href={getDocUrl(r)}
          target="_blank"
          rel="noreferrer"
          title={r.documento_nome || 'Documento validado pela Reitoria'}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          <Paperclip className="w-3 h-3" /> Ver
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </TableCell>
  );
  const getItemLabel = (r: any) => {
    if (r.quantity && r.quantity > 0) return `${r.quantity} equipamentos`;
    if (r.pacote_detail) return `Pacote: ${r.pacote_detail.name}`;
    if (r.equipments_detail && r.equipments_detail.length > 0)
      return r.equipments_detail.map((e: any) => e.full_name || `${e.brand||''} ${e.model||''}`).join(', ');
    return '1 equipamento';
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

    if (formData.quantity > 0 && formData.quantity <= 1) {
      toast({
        title: "Quantidade inválida",
        description: "Para solicitações por quantidade, deve ser superior a 1 equipamento.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const payload: any = {
        user: user!.id,
        equipments: formData.quantity > 0 ? [] : formData.equipments,
        pacote: formData.pacote || null,
        quantity: formData.quantity > 0 ? formData.quantity : 0,
        purpose: formData.purpose,
        expected_return_date: formData.devolucao_mesmo_dia ? new Date().toISOString().split('T')[0] : formData.expectedReturnDate,
        expected_return_time: formData.expectedReturnTime,
        notes: formData.notes,
        devolucao_mesmo_dia: formData.devolucao_mesmo_dia || false,
      };
      const newRequest = await loanRequestsAPI.create(payload);

      setRequests(prev => [newRequest, ...prev]);

      const qr = newRequest.qrcode_hash || (newRequest as any).qrcode_hash;
      if (qr) {
        setQrCodeHash(qr);
        setQrRequestId(newRequest.id || '');
        setQrDialogOpen(true);
      }

      const isNormal = !formData.quantity && (formData.equipments.length > 0 || formData.pacote);
      toast({
        title: "Solicitação enviada!",
        description: isNormal
          ? "Solicitação auto-aprovada. Pode confirmar o levantamento."
          : "Solicitação enviada para aprovação.",
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
    quantity: 2,
      purpose: '',
      expectedReturnDate: '',
      expectedReturnTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5),
      notes: ''
    });
    setIsDialogOpen(false);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    if (isSpecial(selectedRequest) && !decisionDoc && !hasDoc(selectedRequest)) {
      toast({
        title: "Documento obrigatório",
        description: "Solicitação especial: anexe o documento validado pela Reitoria antes de aprovar.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const resposta: any = await loanRequestsAPI.aprovar(
        selectedRequest.id, approvalMotivo, decisionDoc
      );
      const atualizada = resposta?.loan_request;

      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id 
          ? { ...r, ...(atualizada || {}), status: 'autorizado' as LoanRequestStatus }
          : r
      ));
      
      toast({
        title: "Solicitação aprovada!",
        description: decisionDoc
          ? "Aprovada e documento validado anexado."
          : "A solicitação foi aprovada com sucesso.",
      });
      
      setShowApprovalDialog(false);
      setApprovalMotivo('');
      setDecisionDoc(null);
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
      const resposta: any = await loanRequestsAPI.rejeitar(
        selectedRequest.id, rejectionMotivo, decisionDoc
      );
      const atualizada = resposta?.loan_request;

      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id 
          ? { ...r, ...(atualizada || {}), status: 'rejeitado' as LoanRequestStatus }
          : r
      ));
      
      toast({
        title: "Solicitação rejeitada",
        description: decisionDoc
          ? "Rejeitada e documento validado anexado."
          : "A solicitação foi rejeitada.",
        variant: "destructive"
      });
      
      setShowRejectionDialog(false);
      setRejectionMotivo('');
      setDecisionDoc(null);
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

  // ---------------- RF30: atribuir equipamentos ----------------

  const refreshAssignTarget = async (id: string) => {
    const detalhe: any = await loanRequestsAPI.get(id);
    setAssignTarget(detalhe);
    setRequests(prev => prev.map(r => (r.id === id ? { ...r, ...detalhe } : r)));
    return detalhe;
  };

  const openAssignDialog = async (request: any) => {
    setAssignBusy(true);
    setAssignSelected([]);
    setAssignQr('');
    setAssignOpen(true);
    try {
      await refreshAssignTarget(request.id);
      const disponiveis = await equipmentAPI.available();
      setAvailableEquipments(disponiveis.results || disponiveis);
    } catch (error) {
      console.error('Erro ao abrir atribuição:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os equipamentos disponíveis.",
        variant: "destructive"
      });
      setAssignOpen(false);
    } finally {
      setAssignBusy(false);
    }
  };

  const toggleAssignSelected = (equipmentId: number) => {
    setAssignSelected(prev =>
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const handleAssign = async () => {
    if (!assignTarget || assignSelected.length === 0) return;

    setAssignBusy(true);
    try {
      const resposta: any = await loanRequestsAPI.atribuirEquipamentos(assignTarget.id, assignSelected);
      setAssignSelected([]);
      await refreshAssignTarget(assignTarget.id);
      const disponiveis = await equipmentAPI.available();
      setAvailableEquipments(disponiveis.results || disponiveis);
      toast({ title: "Equipamentos atribuídos", description: resposta?.message });
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir",
        description: error?.message || "Não foi possível atribuir os equipamentos.",
        variant: "destructive"
      });
    } finally {
      setAssignBusy(false);
    }
  };

  const handleAssignQr = async (confirmarDisponibilidade = false) => {
    if (!assignTarget || !assignQr.trim()) return;

    setAssignBusy(true);
    try {
      const resposta: any = await loanRequestsAPI.atribuirPorQrCode(
        assignTarget.id, assignQr.trim(), confirmarDisponibilidade
      );
      setAssignQr('');
      await refreshAssignTarget(assignTarget.id);
      const disponiveis = await equipmentAPI.available();
      setAvailableEquipments(disponiveis.results || disponiveis);
      toast({ title: "Equipamento atribuído", description: resposta?.message });
    } catch (error: any) {
      // RN05: o equipamento esta marcado como indisponivel mas o tecnico
      // tem-no em maos e pode confirmar que esta disponivel
      if (error?.status === 409 && error?.data?.requer_confirmacao) {
        const equipamento = error.data.equipamento;
        const confirmar = confirm(
          `${equipamento?.nome} está como "${equipamento?.status_display}".\n\n` +
          `Tem o equipamento consigo e confirma que está disponível?`
        );
        if (confirmar) {
          setAssignBusy(false);
          await handleAssignQr(true);
          return;
        }
      } else {
        toast({
          title: "Erro na leitura",
          description: error?.message || "Não foi possível atribuir por QR Code.",
          variant: "destructive"
        });
      }
    } finally {
      setAssignBusy(false);
    }
  };

  const handleRemoverAtribuido = async (equipmentId: number) => {
    if (!assignTarget) return;

    setAssignBusy(true);
    try {
      await loanRequestsAPI.removerEquipamento(assignTarget.id, equipmentId);
      await refreshAssignTarget(assignTarget.id);
      const disponiveis = await equipmentAPI.available();
      setAvailableEquipments(disponiveis.results || disponiveis);
      toast({ title: "Equipamento removido da solicitação" });
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error?.message || "Não foi possível remover o equipamento.",
        variant: "destructive"
      });
    } finally {
      setAssignBusy(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Tem a certeza que deseja cancelar esta solicitação?")) return;
    setSubmitting(true);
    try {
      await loanRequestsAPI.cancelar(id);
      setRequests(prev => prev.map(r =>
        r.id === id ? { ...r, status: 'cancelado' as LoanRequestStatus } : r
      ));
      toast({ title: "Solicitação cancelada", description: "A solicitação foi cancelada com sucesso." });
    } catch (error) {
      toast({ title: "Erro ao cancelar", description: "Não foi possível cancelar.", variant: "destructive" });
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
                  Preencha os dados para solicitar equipamentos.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleNewRequest} className="space-y-4">
                <div className="flex gap-2">
                  <Button type="button"
                    variant={!formData.quantity ? "default" : "outline"} size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, quantity: 0, equipments: [] }))}>
                    Equipamentos
                  </Button>
                  <Button type="button"
                    variant={formData.quantity > 0 ? "default" : "outline"} size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, quantity: 2, equipments: [], pacote: '' }))}>
                    Por Quantidade
                  </Button>
                </div>

                {formData.quantity > 0 ? (
                  <div className="space-y-2">
                    <Label>Quantidade de Equipamentos</Label>
                    <Input type="number" min="2" value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                      required />
                    <p className="text-sm text-muted-foreground">Mínimo: superior a 1 equipamento</p>
                    {availablePackages.length > 0 && (
                      <div className="space-y-2">
                        <Label>Ou selecione um Pacote</Label>
                        <Select value={formData.pacote} onValueChange={(v) => setFormData(prev => ({ ...prev, pacote: v }))}>
                          <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                          <SelectContent>
                            {availablePackages.map((p: any) => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.total_items} itens)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Equipamento (selecione apenas 1)</Label>
                    <Select value={formData.equipments[0] || ''} onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, equipments: value ? [value] : [] }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecionar equipamento" /></SelectTrigger>
                      <SelectContent>
                        {availableEquipments.map(equipment => (
                          <SelectItem key={equipment.id} value={String(equipment.id)}>
                            {equipment.brand} {equipment.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.equipments.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {formData.equipments.map(eqId => {
                          const eq = availableEquipments.find(e => String(e.id) === eqId);
                          return eq ? (
                            <Badge key={eqId} variant="secondary">
                              {eq.brand} {eq.model}
                              <button type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev, equipments: []
                                }))} className="ml-2">&times;</button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    {availablePackages.length > 0 && (
                      <div className="space-y-2">
                        <Label>Ou selecione um Pacote</Label>
                        <Select value={formData.pacote} onValueChange={(v) => setFormData(prev => ({ ...prev, pacote: v, equipments: [] }))}>
                          <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                          <SelectContent>
                            {availablePackages.map((p: any) => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.total_items} itens)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="purpose">Finalidade da Solicitação</Label>
                  <Textarea id="purpose" value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Descreva o propósito..." required />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="reqMesmoDia"
                    checked={formData.devolucao_mesmo_dia || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, devolucao_mesmo_dia: e.target.checked }))}
                    className="h-4 w-4" />
                  <Label htmlFor="reqMesmoDia">Devolução no mesmo dia?</Label>
                </div>

                {formData.devolucao_mesmo_dia ? (
                  <div className="space-y-2">
                    <Label>Hora Prevista de Devolução</Label>
                    <Input type="time" value={formData.expectedReturnTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedReturnTime: e.target.value }))}
                      required />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data Prevista de Devolução</Label>
                      <Input type="date" value={formData.expectedReturnDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, expectedReturnDate: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora Prevista</Label>
                      <Input type="time" value={formData.expectedReturnTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, expectedReturnTime: e.target.value }))} />
                    </div>
                  </div>
                )}

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
                      <TableHead>QR</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{getUserName(request)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(request.created_at || request.createdAt)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getItemLabel(request)}</TableCell>
                        <TableCell>
                          <p className="max-w-md truncate">{request.purpose}</p>
                        </TableCell>
                        <TableCell>{formatDate(request.expectedReturnDate)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {(request.qrcode_hash || (request as any).qrcode_hash) ? (
                            <a href={`/consulta/${request.qrcode_hash || (request as any).qrcode_hash}`}
                              target="_blank" rel="noreferrer" title="Ver QR Code">
                              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${window.location.origin}/consulta/${request.qrcode_hash || (request as any).qrcode_hash}`}
                                className="w-8 h-8" alt="QR" />
                            </a>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        {renderDocCell(request)}
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {canApprove() && (
                              <>
                                <Button variant="outline" size="sm"
                                  onClick={() => { setSelectedRequest(request); setDecisionDoc(null); setShowApprovalDialog(true); }}
                                  className="bg-success text-success-foreground hover:bg-success/90">
                                  <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                                </Button>
                                <Button variant="outline" size="sm"
                                  onClick={() => { setSelectedRequest(request); setDecisionDoc(null); setShowRejectionDialog(true); }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                                </Button>
                              </>
                            )}
                            <Button variant="outline" size="sm"
                              onClick={() => handleCancel(request.id)}
                              className="text-muted-foreground">
                              <XCircle className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                          </div>
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
                      <TableHead>QR</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authorizedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{getUserName(request)}</TableCell>
                        <TableCell>{getItemLabel(request)}</TableCell>
                        <TableCell>{formatDate(request.expected_return_date || request.expectedReturnDate)}</TableCell>
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
                          {(request.qrcode_hash || (request as any).qrcode_hash) ? (
                            <a href={`/consulta/${request.qrcode_hash || (request as any).qrcode_hash}`} target="_blank" rel="noreferrer">
                              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${window.location.origin}/consulta/${request.qrcode_hash || (request as any).qrcode_hash}`} className="w-8 h-8" alt="QR" />
                            </a>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        {renderDocCell(request)}
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {canAssign() && emFalta(request) > 0 && (
                              <Button variant="outline" size="sm"
                                onClick={() => openAssignDialog(request)}
                                className="bg-gold text-gold-foreground hover:bg-gold/90">
                                <PackagePlus className="w-4 h-4 mr-1" />
                                Atribuir ({emFalta(request)})
                              </Button>
                            )}
                            {canAssign() && (request as any).is_special && emFalta(request) === 0 && (
                              <Button variant="outline" size="sm"
                                onClick={() => openAssignDialog(request)}>
                                <PackagePlus className="w-4 h-4 mr-1" />
                                Equipamentos
                              </Button>
                            )}
                            {canConfirmPickup() && !request.confirmadoPeloTecnico && (
                              <Button variant="outline" size="sm"
                                onClick={() => { setSelectedRequest(request); setShowConfirmPickupDialog(true); }}>
                                <CheckSquare className="w-4 h-4 mr-1" /> Confirmar (Técnico)
                              </Button>
                            )}
                            {user && !request.confirmadoPeloUtente && String(request.user || request.userId) === String(user.id) && (
                              <Button variant="outline" size="sm"
                                onClick={async () => {
                                  try {
                                    await loanRequestsAPI.confirmarLevantamentoUtente(request.id);
                                    toast({ title: "Levantamento confirmado!" });
                                    loadData();
                                  } catch { toast({ title: "Erro", variant: "destructive" }); }
                                }}>
                                <CheckSquare className="w-4 h-4 mr-1" /> Confirmar (Utente)
                              </Button>
                            )}
                            <Button variant="outline" size="sm"
                              onClick={() => handleCancel(request.id)}
                              className="text-muted-foreground">
                              <XCircle className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                          </div>
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
                    <TableHead>QR</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{getUserName(request)}</TableCell>
                      <TableCell>{getItemLabel(request)}</TableCell>
                      <TableCell>
                        <p className="max-w-md truncate">{request.purpose}</p>
                      </TableCell>
                      <TableCell>{formatDate(request.expected_return_date || request.expectedReturnDate)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {(request.qrcode_hash || (request as any).qrcode_hash) ? (
                          <a href={`/consulta/${request.qrcode_hash || (request as any).qrcode_hash}`} target="_blank" rel="noreferrer">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${window.location.origin}/consulta/${request.qrcode_hash || (request as any).qrcode_hash}`} className="w-8 h-8" alt="QR" />
                          </a>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      {renderDocCell(request)}
                      <TableCell>
                        <p className="max-w-xs truncate">
                          {(request as any).motivo_decisao || request.motivoDecisao || '-'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* RF30 - Atribuir equipamentos ao empréstimo */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atribuir equipamentos ao empréstimo</DialogTitle>
            <DialogDescription>
              {assignTarget ? (
                <>
                  Solicitação de <strong>{getUserName(assignTarget)}</strong> — {assignTarget.purpose}
                </>
              ) : 'A carregar...'}
            </DialogDescription>
          </DialogHeader>

          {assignTarget && (
            <div className="space-y-6">
              {/* Contagem pedida vs atribuída */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                  <p className="text-2xl font-bold text-primary">
                    {assignTarget.quantity || assignTarget.equipamentos_atribuidos || 0}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Atribuídos</p>
                  <p className="text-2xl font-bold text-success">
                    {assignTarget.equipamentos_atribuidos ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Em falta</p>
                  <p className={`text-2xl font-bold ${emFalta(assignTarget) > 0 ? 'text-destructive' : 'text-success'}`}>
                    {emFalta(assignTarget)}
                  </p>
                </div>
              </div>

              {/* Já atribuídos */}
              {(assignTarget.equipments_detail || []).length > 0 && (
                <div className="space-y-2">
                  <Label>Já atribuídos</Label>
                  <div className="space-y-2">
                    {(assignTarget.equipments_detail || []).map((eq: any) => (
                      <div key={eq.id}
                        className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
                        <span className="text-sm">
                          {eq.full_name || `${eq.brand || ''} ${eq.model || ''}`.trim() || 'Equipamento'}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {eq.serial_number}
                          </span>
                        </span>
                        <Button variant="ghost" size="sm" disabled={assignBusy}
                          onClick={() => handleRemoverAtribuido(eq.id)}
                          className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Atribuição por QR Code (fluxo alternativo do RF30) */}
              <div className="space-y-2">
                <Label htmlFor="assignQr" className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" /> Atribuir por QR Code
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="assignQr"
                    value={assignQr}
                    onChange={(e) => setAssignQr(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAssignQr(); } }}
                    placeholder="Leia ou cole o código do equipamento"
                    disabled={assignBusy || emFalta(assignTarget) === 0}
                  />
                  <Button type="button" variant="outline"
                    onClick={() => handleAssignQr()}
                    disabled={assignBusy || !assignQr.trim() || emFalta(assignTarget) === 0}>
                    Adicionar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se o equipamento estiver marcado como indisponível, o sistema pergunta se confirma
                  a disponibilidade antes de o associar.
                </p>
              </div>

              {/* Selecção manual */}
              <div className="space-y-2">
                <Label>Equipamentos disponíveis</Label>
                {availableEquipments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                    Não há equipamentos disponíveis de momento.
                  </p>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
                    {availableEquipments.map((eq: any) => {
                      const escolhido = assignSelected.includes(Number(eq.id));
                      const limite = emFalta(assignTarget);
                      const bloqueado = !escolhido && limite > 0 && assignSelected.length >= limite;
                      return (
                        <label key={eq.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
                            escolhido ? 'bg-primary/10' : 'hover:bg-muted'
                          } ${bloqueado ? 'opacity-40' : ''}`}>
                          <Checkbox
                            checked={escolhido}
                            disabled={assignBusy || bloqueado}
                            onCheckedChange={() => toggleAssignSelected(Number(eq.id))}
                          />
                          <span className="flex-1">
                            {eq.full_name || `${eq.brand || ''} ${eq.model || ''}`.trim() || 'Equipamento'}
                            <span className="ml-2 text-xs text-muted-foreground">{eq.serial_number}</span>
                          </span>
                          <Badge variant="outline" className="text-xs">{eq.type}</Badge>
                        </label>
                      );
                    })}
                  </div>
                )}
                {emFalta(assignTarget) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Pode seleccionar no máximo {emFalta(assignTarget)} equipamento(s).
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={assignBusy}>
              Fechar
            </Button>
            <Button onClick={handleAssign} disabled={assignBusy || assignSelected.length === 0}>
              {assignBusy ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A atribuir...</>
              ) : (
                `Atribuir ${assignSelected.length || ''}`.trim()
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

          {/* RF17 - despacho validado pela Reitoria */}
          <div className="space-y-2">
            <Label htmlFor="approvalDoc" className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Documento validado pela Reitoria
              {selectedRequest && isSpecial(selectedRequest) && (
                <span className="text-destructive">*</span>
              )}
            </Label>
            <Input
              id="approvalDoc"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setDecisionDoc(e.target.files?.[0] || null)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              PDF, Word ou imagem, até 10 MB.
              {selectedRequest && isSpecial(selectedRequest)
                ? ' Obrigatório nas solicitações especiais (por quantidade).'
                : ' Opcional nas solicitações normais.'}
            </p>
            {selectedRequest && hasDoc(selectedRequest) && getDocUrl(selectedRequest) && (
              <a
                href={getDocUrl(selectedRequest)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                <FileText className="w-3 h-3" /> Ver documento já anexado
              </a>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleApprove(); }}
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

          {/* RF17 - despacho validado pela Reitoria que fundamenta a rejeicao */}
          <div className="space-y-2">
            <Label htmlFor="rejectionDoc" className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Documento validado pela Reitoria (opcional)
            </Label>
            <Input
              id="rejectionDoc"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setDecisionDoc(e.target.files?.[0] || null)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">PDF, Word ou imagem, até 10 MB.</p>
            {selectedRequest && hasDoc(selectedRequest) && getDocUrl(selectedRequest) && (
              <a
                href={getDocUrl(selectedRequest)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                <FileText className="w-3 h-3" /> Ver documento já anexado
              </a>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleReject(); }}
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

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code da Solicitação #{qrRequestId}</DialogTitle>
            <DialogDescription>
              Imprima e cole no equipamento ou conjunto de equipamentos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeHash && (
              <>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/consulta/${qrCodeHash}`}
                  alt="QR Code" className="border p-2 rounded" />
                <div className="flex gap-2">
                  <a href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${window.location.origin}/consulta/${qrCodeHash}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent h-10 px-4 py-2">
                    Download QR
                  </a>
                  <Button variant="outline" onClick={() => { window.print(); }}>
                    Imprimir
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
