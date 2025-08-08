import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Filter,
  MonitorSpeaker,
  CheckCircle,
  XCircle,
  Clock,
  Wrench
} from 'lucide-react';
import { mockEquipments, mockLoans } from '@/data/mockData';
import { Equipment, EquipmentType, EquipmentStatus } from '@/types';

const equipmentTypes = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'notebook', label: 'Notebook' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'projetor', label: 'Projetor' },
  { value: 'impressora', label: 'Impressora' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'outros', label: 'Outros' }
];

const statusOptions = [
  { value: 'all', label: 'Todos os status' },
  { value: 'disponivel', label: 'Disponível' },
  { value: 'emprestado', label: 'Emprestado' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'manutencao', label: 'Em Manutenção' },
  { value: 'inativo', label: 'Inativo' }
];

export const Consultar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  const filteredEquipments = mockEquipments.filter(equipment => {
    const matchesSearch = 
      equipment.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipment.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipment.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (equipment.description && equipment.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || equipment.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || equipment.status === statusFilter;
    const matchesAvailability = !showOnlyAvailable || equipment.status === 'disponivel';
    
    return matchesSearch && matchesType && matchesStatus && matchesAvailability;
  });

  const getStatusIcon = (status: EquipmentStatus) => {
    switch (status) {
      case 'disponivel':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'emprestado':
        return <Clock className="w-4 h-4 text-info" />;
      case 'reservado':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'manutencao':
        return <Wrench className="w-4 h-4 text-destructive" />;
      case 'inativo':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: EquipmentStatus) => {
    const colors = {
      disponivel: 'bg-success text-success-foreground',
      emprestado: 'bg-info text-info-foreground',
      reservado: 'bg-warning text-warning-foreground',
      manutencao: 'bg-destructive text-destructive-foreground',
      inativo: 'bg-muted text-muted-foreground'
    };

    const labels = {
      disponivel: 'Disponível',
      emprestado: 'Emprestado',
      reservado: 'Reservado',
      manutencao: 'Em Manutenção',
      inativo: 'Inativo'
    };

    return (
      <Badge className={colors[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getCurrentUser = (equipmentId: string) => {
    const currentLoan = mockLoans.find(
      loan => loan.equipmentId === equipmentId && 
      (loan.status === 'ativo' || loan.status === 'atrasado')
    );
    return currentLoan?.userName || null;
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

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    setShowOnlyAvailable(false);
  };

  const availableCount = filteredEquipments.filter(eq => eq.status === 'disponivel').length;
  const totalCount = filteredEquipments.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Consultar Equipamentos</h1>
        <p className="text-muted-foreground">
          Consulte a disponibilidade e status dos equipamentos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Encontrado</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
            <MonitorSpeaker className="w-8 h-8 text-muted-foreground" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Disponíveis</p>
              <p className="text-2xl font-bold text-success">{availableCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-success" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Em Uso</p>
              <p className="text-2xl font-bold text-info">
                {filteredEquipments.filter(eq => eq.status === 'emprestado').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-info" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Manutenção</p>
              <p className="text-2xl font-bold text-destructive">
                {filteredEquipments.filter(eq => eq.status === 'manutencao').length}
              </p>
            </div>
            <Wrench className="w-8 h-8 text-destructive" />
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros de Busca
          </CardTitle>
          <CardDescription>
            Use os filtros para encontrar equipamentos específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Marca, modelo, série..."
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
                  {equipmentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button
                  variant={showOnlyAvailable ? "default" : "outline"}
                  onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                  className="flex-1"
                >
                  Só Disponíveis
                </Button>
                <Button variant="outline" onClick={clearFilters}>
                  Limpar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resultados da Consulta ({filteredEquipments.length} equipamentos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEquipments.length === 0 ? (
            <div className="text-center py-8">
              <MonitorSpeaker className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Nenhum equipamento encontrado
              </h3>
              <p className="text-sm text-muted-foreground">
                Tente ajustar os filtros de busca para encontrar o que procura
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Número de Série</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Usuário Atual</TableHead>
                  <TableHead>Data de Aquisição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipments.map((equipment) => {
                  const currentUser = getCurrentUser(equipment.id);
                  
                  return (
                    <TableRow key={equipment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{equipment.brand} {equipment.model}</p>
                          {equipment.description && (
                            <p className="text-sm text-muted-foreground">{equipment.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{equipment.type}</span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {equipment.serialNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(equipment.status)}
                          {getStatusBadge(equipment.status)}
                        </div>
                      </TableCell>
                      <TableCell>{equipment.location || '-'}</TableCell>
                      <TableCell>
                        {currentUser ? (
                          <span className="text-sm font-medium">{currentUser}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(equipment.acquisitionDate || equipment.acquisition_date)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};