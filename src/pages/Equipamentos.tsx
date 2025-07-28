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
  Edit, 
  Trash2, 
  Power,
  MonitorSpeaker,
  Laptop,
  Tablet,
  Projector,
  Printer,
  Monitor
} from 'lucide-react';
import { mockEquipments } from '@/data/mockData';
import { Equipment, EquipmentType, EquipmentStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';

const equipmentTypes: { value: EquipmentType; label: string; icon: React.ComponentType<any> }[] = [
  { value: 'notebook', label: 'Notebook', icon: Laptop },
  { value: 'desktop', label: 'Desktop', icon: MonitorSpeaker },
  { value: 'tablet', label: 'Tablet', icon: Tablet },
  { value: 'projetor', label: 'Projetor', icon: Projector },
  { value: 'impressora', label: 'Impressora', icon: Printer },
  { value: 'monitor', label: 'Monitor', icon: Monitor },
  { value: 'outros', label: 'Outros', icon: MonitorSpeaker }
];

const statusOptions: { value: EquipmentStatus; label: string; color: string }[] = [
  { value: 'disponivel', label: 'Disponível', color: 'bg-success text-success-foreground' },
  { value: 'emprestado', label: 'Emprestado', color: 'bg-info text-info-foreground' },
  { value: 'reservado', label: 'Reservado', color: 'bg-warning text-warning-foreground' },
  { value: 'manutencao', label: 'Manutenção', color: 'bg-destructive text-destructive-foreground' },
  { value: 'inativo', label: 'Inativo', color: 'bg-muted text-muted-foreground' }
];

export const Equipamentos = () => {
  const [equipments, setEquipments] = useState<Equipment[]>(mockEquipments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    type: 'notebook' as EquipmentType,
    status: 'disponivel' as EquipmentStatus,
    serialNumber: '',
    acquisitionDate: '',
    description: '',
    location: ''
  });

  const filteredEquipments = equipments.filter(equipment => {
    const matchesSearch = equipment.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipment.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipment.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || equipment.status === statusFilter;
    const matchesType = typeFilter === 'all' || equipment.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: EquipmentStatus) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color}>
        {statusConfig?.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: EquipmentType) => {
    const typeConfig = equipmentTypes.find(t => t.value === type);
    const IconComponent = typeConfig?.icon || MonitorSpeaker;
    return <IconComponent className="w-4 h-4" />;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingEquipment) {
      // Update existing equipment
      setEquipments(prev => prev.map(eq => 
        eq.id === editingEquipment.id 
          ? { ...eq, ...formData }
          : eq
      ));
      toast({
        title: "Equipamento atualizado!",
        description: "As informações foram salvas com sucesso.",
      });
    } else {
      // Add new equipment
      const newEquipment: Equipment = {
        id: Date.now().toString(),
        ...formData
      };
      setEquipments(prev => [...prev, newEquipment]);
      toast({
        title: "Equipamento cadastrado!",
        description: "O novo equipamento foi adicionado ao sistema.",
      });
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      brand: '',
      model: '',
      type: 'notebook',
      status: 'disponivel',
      serialNumber: '',
      acquisitionDate: '',
      description: '',
      location: ''
    });
    setEditingEquipment(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (equipment: Equipment) => {
    setFormData({
      brand: equipment.brand,
      model: equipment.model,
      type: equipment.type,
      status: equipment.status,
      serialNumber: equipment.serialNumber,
      acquisitionDate: equipment.acquisitionDate,
      description: equipment.description || '',
      location: equipment.location || ''
    });
    setEditingEquipment(equipment);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = (equipment: Equipment) => {
    const newStatus = equipment.status === 'inativo' ? 'disponivel' : 'inativo';
    setEquipments(prev => prev.map(eq => 
      eq.id === equipment.id 
        ? { ...eq, status: newStatus as EquipmentStatus }
        : eq
    ));
    toast({
      title: "Status alterado!",
      description: `Equipamento ${newStatus === 'inativo' ? 'desativado' : 'ativado'} com sucesso.`,
    });
  };

  const handleDelete = (equipment: Equipment) => {
    if (confirm('Tem certeza que deseja excluir este equipamento?')) {
      setEquipments(prev => prev.filter(eq => eq.id !== equipment.id));
      toast({
        title: "Equipamento excluído!",
        description: "O equipamento foi removido do sistema.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gestão de Equipamentos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os equipamentos disponíveis para empréstimo
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary" onClick={() => setEditingEquipment(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Equipamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEquipment ? 'Editar Equipamento' : 'Cadastrar Novo Equipamento'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do equipamento abaixo.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as EquipmentType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {equipmentTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as EquipmentStatus }))}
                  >
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Número de Série</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acquisitionDate">Data de Aquisição</Label>
                  <Input
                    id="acquisitionDate"
                    type="date"
                    value={formData.acquisitionDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, acquisitionDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ex: Laboratório 1, Sala 201..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição adicional do equipamento..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-gradient-primary">
                  {editingEquipment ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar equipamentos específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Marca, modelo ou número de série..."
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
            
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {equipmentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Equipamentos ({filteredEquipments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Número de Série</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipments.map((equipment) => (
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
                    <div className="flex items-center gap-2">
                      {getTypeIcon(equipment.type)}
                      <span className="capitalize">{equipment.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{equipment.serialNumber}</TableCell>
                  <TableCell>{getStatusBadge(equipment.status)}</TableCell>
                  <TableCell>{equipment.location}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(equipment)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(equipment)}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(equipment)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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