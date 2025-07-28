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
  Printer
} from 'lucide-react';
import { mockLoans, mockEquipments } from '@/data/mockData';
import { Loan, LoanStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const statusOptions: { value: LoanStatus; label: string; color: string }[] = [
  { value: 'ativo', label: 'Ativo', color: 'bg-info text-info-foreground' },
  { value: 'atrasado', label: 'Atrasado', color: 'bg-destructive text-destructive-foreground' },
  { value: 'concluido', label: 'Concluído', color: 'bg-success text-success-foreground' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-muted text-muted-foreground' }
];

export const Emprestimos = () => {
  const [loans, setLoans] = useState<Loan[]>(mockLoans);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    equipmentId: '',
    expectedReturnDate: '',
    purpose: '',
    notes: ''
  });

  const availableEquipments = mockEquipments.filter(eq => eq.status === 'disponivel');

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.equipmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: LoanStatus) => {
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

  const isOverdue = (loan: Loan) => {
    if (loan.status === 'concluido' || loan.status === 'cancelado') return false;
    return new Date(loan.expectedReturnDate) < new Date();
  };

  const handleNewLoan = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedEquipment = availableEquipments.find(eq => eq.id === formData.equipmentId);
    if (!selectedEquipment || !user) return;

    const newLoan: Loan = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      equipmentId: formData.equipmentId,
      equipmentName: `${selectedEquipment.brand} ${selectedEquipment.model}`,
      startDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: formData.expectedReturnDate,
      status: 'ativo',
      purpose: formData.purpose,
      notes: formData.notes
    };

    setLoans(prev => [...prev, newLoan]);
    
    toast({
      title: "Empréstimo registrado!",
      description: "O empréstimo foi criado com sucesso.",
    });
    
    resetForm();
    setSelectedLoan(newLoan);
    setShowTicketDialog(true);
  };

  const resetForm = () => {
    setFormData({
      equipmentId: '',
      expectedReturnDate: '',
      purpose: '',
      notes: ''
    });
    setIsDialogOpen(false);
  };

  const handleReturn = (loan: Loan) => {
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
  };

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
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
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
                      <SelectItem key={equipment.id} value={equipment.id}>
                        {equipment.brand} {equipment.model} - {equipment.serialNumber}
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
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-gradient-primary">
                  Registrar Empréstimo
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
      <Tabs defaultValue="ativos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ativos">Ativos ({activeLoans.length})</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos ({completedLoans.length})</TabsTrigger>
          <TabsTrigger value="todos">Todos ({filteredLoans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ativos">
          <Card>
            <CardHeader>
              <CardTitle>Empréstimos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Data de Início</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLoans.map((loan) => (
                    <TableRow key={loan.id} className={isOverdue(loan) ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.userName}</p>
                          <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{loan.equipmentName}</p>
                      </TableCell>
                      <TableCell>{formatDate(loan.startDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {formatDate(loan.expectedReturnDate)}
                          {isOverdue(loan) && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(isOverdue(loan) ? 'atrasado' : loan.status)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReturn(loan)}
                          className="bg-success text-success-foreground hover:bg-success/90"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Devolver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="concluidos">
          <Card>
            <CardHeader>
              <CardTitle>Empréstimos Concluídos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Data de Início</TableHead>
                    <TableHead>Data de Devolução</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.userName}</p>
                          <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{loan.equipmentName}</p>
                      </TableCell>
                      <TableCell>{formatDate(loan.startDate)}</TableCell>
                      <TableCell>
                        {loan.actualReturnDate ? formatDate(loan.actualReturnDate) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                    <TableHead>Data de Início</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.userName}</p>
                          <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{loan.equipmentName}</p>
                      </TableCell>
                      <TableCell>{formatDate(loan.startDate)}</TableCell>
                      <TableCell>{formatDate(loan.expectedReturnDate)}</TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      <TableCell>
                        {(loan.status === 'ativo' || loan.status === 'atrasado') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReturn(loan)}
                            className="bg-success text-success-foreground hover:bg-success/90"
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
                <p className="text-sm text-muted-foreground">Universidade Federal</p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Empréstimo:</span>
                  <span className="font-mono">#{selectedLoan.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usuário:</span>
                  <span>{selectedLoan.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Equipamento:</span>
                  <span>{selectedLoan.equipmentName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data de Início:</span>
                  <span>{formatDate(selectedLoan.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data de Devolução:</span>
                  <span>{formatDate(selectedLoan.expectedReturnDate)}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
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
    </div>
  );
};