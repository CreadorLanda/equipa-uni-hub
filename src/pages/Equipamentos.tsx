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
  Edit, 
  Trash2, 
  Power,
  MonitorSpeaker,
  Laptop,
  Tablet,
  Projector,
  Printer,
  Monitor,
  Loader2
} from 'lucide-react';
import { Equipment, EquipmentType, EquipmentStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { equipmentAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Carrega equipamentos da API
  useEffect(() => {
    loadEquipments();
  }, []);

  const loadEquipments = async () => {
    try {
      setLoading(true);
      const data = await equipmentAPI.list();
      setEquipments(data.results || data);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
      toast({
        title: "Erro ao carregar equipamentos",
        description: "Não foi possível carregar a lista de equipamentos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Verifica permissões do usuário
  const canManageEquipment = () => {
    // Requisito: somente técnicos podem cadastrar, editar e remover
    return user?.role === 'tecnico';
  };

  const canDeleteEquipment = () => {
    // Requisito: somente técnicos podem remover
    return user?.role === 'tecnico';
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManageEquipment()) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para gerenciar equipamentos.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    
    try {
      if (editingEquipment) {
        // Update existing equipment
        const updatedEquipment = await equipmentAPI.update(editingEquipment.id, {
          brand: formData.brand,
          model: formData.model,
          type: formData.type,
          status: formData.status,
          serial_number: formData.serialNumber,
          acquisition_date: formData.acquisitionDate,
          description: formData.description,
          location: formData.location
        });
        
        setEquipments(prev => prev.map(eq => 
          eq.id === editingEquipment.id ? updatedEquipment : eq
        ));
        
        toast({
          title: "Equipamento atualizado!",
          description: "As informações foram salvas com sucesso.",
        });
      } else {
        // Add new equipment
        const newEquipment = await equipmentAPI.create({
          brand: formData.brand,
          model: formData.model,
          type: formData.type,
          status: formData.status,
          serial_number: formData.serialNumber,
          acquisition_date: formData.acquisitionDate,
          description: formData.description,
          location: formData.location
        });
        
        setEquipments(prev => [...prev, newEquipment]);
        
        toast({
          title: "Equipamento cadastrado!",
          description: "O novo equipamento foi adicionado ao sistema.",
        });
      }
      
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar equipamento:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o equipamento. Verifique os dados.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
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

  const handleToggleStatus = async (equipment: Equipment) => {
    if (!canManageEquipment()) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para alterar status de equipamentos.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newStatus = equipment.status === 'inativo' ? 'disponivel' : 'inativo';
      
      if (newStatus === 'disponivel') {
        await equipmentAPI.setAvailable(equipment.id);
      } else {
        // Para inativar, usar PATCH para enviar somente o campo necessário
        await equipmentAPI.partialUpdate(equipment.id, { status: 'inativo' });
      }
      
      setEquipments(prev => prev.map(eq => 
        eq.id === equipment.id 
          ? { ...eq, status: newStatus as EquipmentStatus }
          : eq
      ));
      
      toast({
        title: "Status alterado!",
        description: `Equipamento ${newStatus === 'inativo' ? 'desativado' : 'ativado'} com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro ao alterar status",
        description: "Não foi possível alterar o status do equipamento.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (equipment: Equipment) => {
    if (!canDeleteEquipment()) {
      toast({
        title: "Acesso negado",
        description: "Apenas coordenadores podem excluir equipamentos.",
        variant: "destructive"
      });
      return;
    }

    if (equipment.status === 'emprestado' || equipment.status === 'reservado') {
      toast({
        title: "Não é possível excluir",
        description: "Não é possível excluir equipamentos emprestados ou reservados.",
        variant: "destructive"
      });
      return;
    }

    if (confirm('Tem certeza que deseja excluir este equipamento?')) {
      try {
        await equipmentAPI.delete(equipment.id);
        setEquipments(prev => prev.filter(eq => eq.id !== equipment.id));
        toast({
          title: "Equipamento excluído!",
          description: "O equipamento foi removido do sistema.",
          variant: "destructive"
        });
      } catch (error) {
        console.error('Erro ao excluir equipamento:', error);
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o equipamento.",
          variant: "destructive"
        });
      }
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
        
        {canManageEquipment() && (
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
                <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingEquipment ? 'Atualizando...' : 'Cadastrando...'}
                    </>
                  ) : (
                    editingEquipment ? 'Atualizar' : 'Cadastrar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}
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
          <CardTitle>Lista de Equipamentos ({loading ? '...' : filteredEquipments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Carregando equipamentos...</span>
            </div>
          ) : filteredEquipments.length === 0 ? (
            <div className="text-center py-12">
              <MonitorSpeaker className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhum equipamento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {equipments.length === 0 
                  ? "Ainda não há equipamentos cadastrados no sistema."
                  : "Nenhum equipamento corresponde aos filtros aplicados."}
              </p>
              {canManageEquipment() && equipments.length === 0 && (
                <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Primeiro Equipamento
                </Button>
              )}
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
                      {canManageEquipment() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(equipment)}
                          title="Editar equipamento"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canManageEquipment() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(equipment)}
                          title={equipment.status === 'inativo' ? 'Ativar equipamento' : 'Inativar equipamento'}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      )}
                      {canDeleteEquipment() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(equipment)}
                          title="Excluir equipamento"
                          disabled={equipment.status === 'emprestado' || equipment.status === 'reservado'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {!canManageEquipment() && !canDeleteEquipment() && (
                        <span className="text-sm text-muted-foreground italic">
                          Sem permissões
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