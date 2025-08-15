import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardAPI, equipmentAPI, loansAPI, reservationsAPI } from '@/lib/api';
import { Loan, Equipment, Reservation, DashboardStats } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Relatorios = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('emprestimos');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const { toast } = useToast();

  // Carrega dados da API
  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // Carrega estatísticas do dashboard
      const dashboardData = await dashboardAPI.stats();
      setStats(dashboardData);

      // Carrega todos os dados para relatórios
      const [equipmentData, loansData, reservationsData] = await Promise.all([
        equipmentAPI.list(),
        loansAPI.list(),
        reservationsAPI.list()
      ]);

      setEquipments(equipmentData.results || equipmentData);
      setLoans(loansData.results || loansData);
      setReservations(reservationsData.results || reservationsData);
      
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados para o relatório.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificações de permissão
  const canGenerateReports = () => {
    return user?.role && ['tecnico', 'secretario', 'coordenador'].includes(user.role);
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

  const generatePDF = async () => {
    if (!canGenerateReports()) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para gerar relatórios.",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('Relatório do Sistema EquipaHub', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, 20, 30);
      doc.text(`Período: ${startDate ? formatDate(startDate) : 'Início'} - ${endDate ? formatDate(endDate) : 'Atual'}`, 20, 40);
      doc.text(`Tipo: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 20, 50);
      
      let yPos = 70;

      if (reportType === 'geral' || reportType === 'equipamentos') {
        // Estatísticas de Equipamentos
        doc.setFontSize(16);
        doc.text('Estatísticas de Equipamentos', 20, yPos);
        yPos += 10;
        
        const equipmentStats = [
          ['Total de Equipamentos', stats?.totalEquipments || equipments.length],
          ['Disponíveis', stats?.availableEquipments || equipments.filter(e => e.status === 'disponivel').length],
          ['Emprestados', stats?.loanedEquipments || equipments.filter(e => e.status === 'emprestado').length],
          ['Em Manutenção', stats?.maintenanceEquipments || equipments.filter(e => e.status === 'manutencao').length]
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Categoria', 'Quantidade']],
          body: equipmentStats,
          margin: { left: 20 },
          pageBreak: 'avoid'
        });

        yPos = (doc as any).lastAutoTable.finalY + 20;
      }

      if (reportType === 'geral' || reportType === 'emprestimos') {
        // Estatísticas de Empréstimos
        doc.setFontSize(16);
        doc.text('Estatísticas de Empréstimos', 20, yPos);
        yPos += 10;
        
        const loanStats = [
          ['Total de Empréstimos', stats?.totalLoans || loans.length],
          ['Ativos', stats?.activeLoans || loans.filter(l => l.status === 'ativo').length],
          ['Em Atraso', stats?.overdueLoans || loans.filter(l => l.status === 'atrasado').length],
          ['Concluídos', loans.filter(l => l.status === 'concluido').length]
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Categoria', 'Quantidade']],
          body: loanStats,
          margin: { left: 20 },
          pageBreak: 'avoid'
        });

        yPos = (doc as any).lastAutoTable.finalY + 20;
      }

      if (reportType === 'geral' || reportType === 'reservas') {
        // Estatísticas de Reservas
        doc.setFontSize(16);
        doc.text('Estatísticas de Reservas', 20, yPos);
        yPos += 10;
        
        const reservationStats = [
          ['Total de Reservas', stats?.totalReservations || reservations.length],
          ['Ativas', stats?.activeReservations || reservations.filter(r => r.status === 'ativa').length],
          ['Confirmadas', reservations.filter(r => r.status === 'confirmada').length],
          ['Canceladas', reservations.filter(r => r.status === 'cancelada').length]
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Categoria', 'Quantidade']],
          body: reservationStats,
          margin: { left: 20 },
          pageBreak: 'avoid'
        });
      }

      // Salva o PDF
      const fileName = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "PDF gerado com sucesso!",
        description: `O arquivo ${fileName} foi baixado.`,
      });
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório em PDF.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPDF = () => {
    // Só gera relatório quando tiver empréstimos (independente do tipo selecionado)
    const { filteredLoans } = getFilteredData();
    if (filteredLoans.length === 0) {
      toast({
        title: 'Nada para exportar',
        description: 'Não há empréstimos no período selecionado para gerar o PDF.',
        variant: 'destructive'
      });
      return;
    }
    generatePDF();
  };

  const handleExportExcel = () => {
    if (!canGenerateReports()) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para gerar relatórios.",
        variant: "destructive"
      });
      return;
    }

    // Só gera relatório quando tiver empréstimos
    const { filteredLoans } = getFilteredData();
    if (filteredLoans.length === 0) {
      toast({
        title: 'Nada para exportar',
        description: 'Não há empréstimos no período selecionado para exportar.',
        variant: 'destructive'
      });
      return;
    }

    // Exportação simples para CSV (compatível com Excel)
    const headers = ['ID', 'Usuário', 'Equipamento', 'Data de Início', 'Hora de Início', 'Data Prevista', 'Status', 'Finalidade'];
    const rows = filteredLoans.map((loan) => [
      loan.id,
      loan.userName || loan.user_name,
      loan.equipmentName || loan.equipment_name,
      new Date(loan.startDate || loan.start_date).toLocaleDateString('pt-BR'),
      (loan.startTime || loan.start_time) || 'Hora não definida',
      new Date(loan.expectedReturnDate || loan.expected_return_date).toLocaleDateString('pt-BR'),
      loan.status,
      (loan.purpose || '').replace(/\n|\r/g, ' ')
    ]);

    const csvContent = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_emprestimos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exportado com sucesso!',
      description: 'O arquivo CSV foi gerado e baixado.',
    });
  };

  // Estatísticas gerais (dados reais)
  const totalEquipments = stats?.totalEquipments || equipments.length;
  const availableEquipments = stats?.availableEquipments || equipments.filter(eq => eq.status === 'disponivel').length;
  const loanedEquipments = stats?.loanedEquipments || equipments.filter(eq => eq.status === 'emprestado').length;
  const maintenanceEquipments = stats?.maintenanceEquipments || equipments.filter(eq => eq.status === 'manutencao').length;

  const totalLoans = stats?.totalLoans || loans.length;
  const activeLoans = stats?.activeLoans || loans.filter(loan => loan.status === 'ativo').length;
  const overdueLoans = stats?.overdueLoans || loans.filter(loan => loan.status === 'atrasado').length;
  const completedLoans = loans.filter(loan => loan.status === 'concluido').length;

  const totalReservations = stats?.totalReservations || reservations.length;
  const activeReservations = stats?.activeReservations || reservations.filter(res => res.status === 'ativa').length;

  // Equipamentos por tipo (dados reais)
  const equipmentsByType = equipments.reduce((acc, eq) => {
    acc[eq.type] = (acc[eq.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filtrar dados por período se fornecido
  const getFilteredData = () => {
    let filteredLoans = loans;
    let filteredReservations = reservations;

    if (startDate) {
      filteredLoans = filteredLoans.filter(loan => 
        new Date(loan.startDate || loan.start_date) >= new Date(startDate)
      );
      filteredReservations = filteredReservations.filter(res => 
        new Date(res.reservationDate || res.reservation_date) >= new Date(startDate)
      );
    }

    if (endDate) {
      filteredLoans = filteredLoans.filter(loan => 
        new Date(loan.startDate || loan.start_date) <= new Date(endDate)
      );
      filteredReservations = filteredReservations.filter(res => 
        new Date(res.reservationDate || res.reservation_date) <= new Date(endDate)
      );
    }

    return { filteredLoans, filteredReservations };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios detalhados sobre o sistema de empréstimos
          </p>
        </div>
        
        {canGenerateReports() && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportPDF}
              disabled={loading || generating}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar PDF
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportExcel}
              disabled={loading || generating}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        )}
      </div>

      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Relatório</CardTitle>
          <CardDescription>
            Selecione o período e tipo de relatório desejado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emprestimos">Empréstimos</SelectItem>
                  <SelectItem value="equipamentos">Equipamentos</SelectItem>
                  <SelectItem value="reservas">Reservas</SelectItem>
                  <SelectItem value="geral">Relatório Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            {/* Botão removido a pedido: Gerar Relatório */}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="emprestimos">Empréstimos</TabsTrigger>
          <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
          <TabsTrigger value="reservas">Reservas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Carregando dados do relatório...</span>
            </div>
          ) : (
            <>
              {/* Estatísticas Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-l-4 border-l-primary">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Equipamentos</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{totalEquipments}</div>
                    <p className="text-xs text-muted-foreground">
                      {availableEquipments} disponíveis
                    </p>
                  </CardContent>
                </Card>

            <Card className="border-l-4 border-l-secondary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Empréstimos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary">{totalLoans}</div>
                <p className="text-xs text-muted-foreground">
                  {activeLoans} ativos
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-accent">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Reservas</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">{totalReservations}</div>
                <p className="text-xs text-muted-foreground">
                  {activeReservations} ativas
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-warning">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Manutenção</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{maintenanceEquipments}</div>
                <p className="text-xs text-muted-foreground">
                  Equipamentos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Equipamentos por Tipo */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Equipamentos por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(equipmentsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="capitalize font-medium">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${(count / totalEquipments) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        <TabsContent value="emprestimos">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Empréstimos</CardTitle>
              <CardDescription>
                Lista detalhada de todos os empréstimos registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Data/Hora de Início</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Finalidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        <span>Carregando empréstimos...</span>
                      </TableCell>
                    </TableRow>
                  ) : getFilteredData().filteredLoans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum empréstimo encontrado no período selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredData().filteredLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-mono">#{loan.id}</TableCell>
                        <TableCell>{loan.userName || loan.user_name}</TableCell>
                        <TableCell>{loan.equipmentName || loan.equipment_name}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatDate(loan.startDate || loan.start_date)}</p>
                            <p className="text-sm text-muted-foreground">
                              {(loan.startTime || loan.start_time) ? (loan.startTime || loan.start_time) : 'Hora não definida'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(loan.expectedReturnDate || loan.expected_return_date)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            loan.status === 'ativo' ? 'bg-info text-info-foreground' :
                            loan.status === 'atrasado' ? 'bg-destructive text-destructive-foreground' :
                            loan.status === 'concluido' ? 'bg-success text-success-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {loan.status}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{loan.purpose}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipamentos">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Equipamentos</CardTitle>
              <CardDescription>
                Lista detalhada de todos os equipamentos cadastrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Número de Série</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Aquisição</TableHead>
                    <TableHead>Localização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        <span>Carregando equipamentos...</span>
                      </TableCell>
                    </TableRow>
                  ) : equipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum equipamento cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    equipments.map((equipment) => (
                      <TableRow key={equipment.id}>
                        <TableCell className="font-mono">#{equipment.id}</TableCell>
                        <TableCell>{equipment.brand} {equipment.model}</TableCell>
                        <TableCell className="capitalize">{equipment.type}</TableCell>
                        <TableCell className="font-mono">{equipment.serialNumber || equipment.serial_number}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            equipment.status === 'disponivel' ? 'bg-success text-success-foreground' :
                            equipment.status === 'emprestado' ? 'bg-info text-info-foreground' :
                            equipment.status === 'reservado' ? 'bg-warning text-warning-foreground' :
                            equipment.status === 'manutencao' ? 'bg-destructive text-destructive-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {equipment.status}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(equipment.acquisitionDate || equipment.acquisition_date)}</TableCell>
                        <TableCell>{equipment.location}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservas">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Reservas</CardTitle>
              <CardDescription>
                Lista detalhada de todas as reservas registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Data da Reserva</TableHead>
                    <TableHead>Data de Retirada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Finalidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        <span>Carregando reservas...</span>
                      </TableCell>
                    </TableRow>
                  ) : getFilteredData().filteredReservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma reserva encontrada no período selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredData().filteredReservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-mono">#{reservation.id}</TableCell>
                        <TableCell>{reservation.userName || reservation.user_name}</TableCell>
                        <TableCell>{reservation.equipmentName || reservation.equipment_name}</TableCell>
                        <TableCell>{formatDate(reservation.reservationDate || reservation.reservation_date)}</TableCell>
                        <TableCell>{formatDate(reservation.expectedPickupDate || reservation.expected_pickup_date)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            reservation.status === 'ativa' ? 'bg-info text-info-foreground' :
                            reservation.status === 'confirmada' ? 'bg-success text-success-foreground' :
                            reservation.status === 'cancelada' ? 'bg-destructive text-destructive-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {reservation.status}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{reservation.purpose}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};