import { useState } from 'react';
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
  TrendingUp
} from 'lucide-react';
import { mockLoans, mockEquipments, mockReservations } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

export const Relatorios = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('emprestimos');
  const { toast } = useToast();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleExportPDF = () => {
    toast({
      title: "Exportando PDF...",
      description: "O relatório será baixado em breve.",
    });
    // Simulação de exportação
    setTimeout(() => {
      toast({
        title: "PDF exportado!",
        description: "O arquivo foi salvo com sucesso.",
      });
    }, 2000);
  };

  const handleExportExcel = () => {
    toast({
      title: "Exportando Excel...",
      description: "O relatório será baixado em breve.",
    });
    // Simulação de exportação
    setTimeout(() => {
      toast({
        title: "Excel exportado!",
        description: "O arquivo foi salvo com sucesso.",
      });
    }, 2000);
  };

  // Estatísticas gerais
  const totalEquipments = mockEquipments.length;
  const availableEquipments = mockEquipments.filter(eq => eq.status === 'disponivel').length;
  const loanedEquipments = mockEquipments.filter(eq => eq.status === 'emprestado').length;
  const maintenanceEquipments = mockEquipments.filter(eq => eq.status === 'manutencao').length;

  const totalLoans = mockLoans.length;
  const activeLoans = mockLoans.filter(loan => loan.status === 'ativo').length;
  const overdueLoans = mockLoans.filter(loan => loan.status === 'atrasado').length;
  const completedLoans = mockLoans.filter(loan => loan.status === 'concluido').length;

  const totalReservations = mockReservations.length;
  const activeReservations = mockReservations.filter(res => res.status === 'ativa').length;

  // Equipamentos por tipo
  const equipmentsByType = mockEquipments.reduce((acc, eq) => {
    acc[eq.type] = (acc[eq.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios detalhados sobre o sistema de empréstimos
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
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
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button className="w-full bg-gradient-primary">
                <BarChart3 className="w-4 h-4 mr-2" />
                Gerar Relatório
              </Button>
            </div>
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
                    <TableHead>Data de Início</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Finalidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-mono">#{loan.id}</TableCell>
                      <TableCell>{loan.userName}</TableCell>
                      <TableCell>{loan.equipmentName}</TableCell>
                      <TableCell>{formatDate(loan.startDate)}</TableCell>
                      <TableCell>{formatDate(loan.expectedReturnDate)}</TableCell>
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
                  ))}
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
                  {mockEquipments.map((equipment) => (
                    <TableRow key={equipment.id}>
                      <TableCell className="font-mono">#{equipment.id}</TableCell>
                      <TableCell>{equipment.brand} {equipment.model}</TableCell>
                      <TableCell className="capitalize">{equipment.type}</TableCell>
                      <TableCell className="font-mono">{equipment.serialNumber}</TableCell>
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
                      <TableCell>{formatDate(equipment.acquisitionDate)}</TableCell>
                      <TableCell>{equipment.location}</TableCell>
                    </TableRow>
                  ))}
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
                  {mockReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-mono">#{reservation.id}</TableCell>
                      <TableCell>{reservation.userName}</TableCell>
                      <TableCell>{reservation.equipmentName}</TableCell>
                      <TableCell>{formatDate(reservation.reservationDate)}</TableCell>
                      <TableCell>{formatDate(reservation.expectedPickupDate)}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};