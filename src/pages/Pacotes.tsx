import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { packagesAPI, equipmentAPI } from '@/lib/api';
import { EquipmentPackage, Equipment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Plus, Trash2, Copy, Edit, CheckCircle, XCircle } from 'lucide-react';

export default function Pacotes() {
    const { user } = useAuth();
    const [packages, setPackages] = useState<EquipmentPackage[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<EquipmentPackage | null>(null);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_template: true,
        items: [] as { equipment_id: string; quantity: number; is_optional: boolean }[]
    });

    const [selectedEquipment, setSelectedEquipment] = useState('');
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemOptional, setItemOptional] = useState(false);

    useEffect(() => {
        loadPackages();
        loadEquipments();
    }, []);

    const loadPackages = async () => {
        try {
            setLoading(true);
            const data = await packagesAPI.list();
            const list = Array.isArray(data) ? data : (data as any).results || [];
            setPackages(list);
        } catch (error) {
            toast.error('Erro ao carregar pacotes');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadEquipments = async () => {
        try {
            const data = await equipmentAPI.list();
            const list = Array.isArray(data) ? data : (data as any).results || [];
            setEquipments(list);
        } catch (error) {
            console.error('Erro ao carregar equipamentos:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.items.length === 0) {
            toast.error('Adicione pelo menos um equipamento ao pacote');
            return;
        }

        try {
            if (editingPackage) {
                await packagesAPI.update(editingPackage.id, {
                    name: formData.name,
                    description: formData.description,
                    is_template: formData.is_template
                });
                toast.success('Pacote atualizado com sucesso!');
            } else {
                await packagesAPI.create(formData);
                toast.success('Pacote criado com sucesso!');
            }

            resetForm();
            setIsDialogOpen(false);
            loadPackages();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao salvar pacote');
        }
    };

    const handleAddItem = () => {
        if (!selectedEquipment) {
            toast.error('Selecione um equipamento');
            return;
        }

        const alreadyAdded = formData.items.find(item => item.equipment_id === selectedEquipment);
        if (alreadyAdded) {
            toast.error('Este equipamento já foi adicionado');
            return;
        }

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, {
                equipment_id: selectedEquipment,
                quantity: itemQuantity,
                is_optional: itemOptional
            }]
        }));

        setSelectedEquipment('');
        setItemQuantity(1);
        setItemOptional(false);
        toast.success('Equipamento adicionado ao pacote');
    };

    const handleRemoveItem = (equipment_id: string) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter(item => item.equipment_id !== equipment_id)
        }));
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja deletar este pacote?')) return;

        try {
            await packagesAPI.delete(id);
            toast.success('Pacote deletado com sucesso!');
            loadPackages();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao deletar pacote');
        }
    };

    const handleEditPackage = (pkg: EquipmentPackage) => {
        setFormData({
            name: pkg.name,
            description: pkg.description || '',
            is_template: pkg.is_template,
            items: (pkg.items || []).map((item: any) => ({
                equipment_id: String(item.equipment?.id || item.equipment_id || ''),
                quantity: item.quantity || 1,
                is_optional: item.is_optional || false,
            })),
        });
        setEditingPackage(pkg);
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            is_template: true,
            items: []
        });
        setEditingPackage(null);
        setSelectedEquipment('');
        setItemQuantity(1);
        setItemOptional(false);
    };

    const canManagePackages = () => {
        return user?.role === 'tecnico' || user?.role === 'secretario' || user?.role === 'coordenador';
    };

    const getEquipmentName = (item: any) => {
        const eqId = String(item.equipment?.id || item.equipment_id || '');
        const equipment = equipments.find(eq => String(eq.id) === eqId);
        return equipment ? `${equipment.brand} ${equipment.model}` : (item.equipment?.full_name || eqId || 'Equipamento');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Carregando pacotes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Pacotes de Equipamentos</h1>
                    <p className="text-muted-foreground">Gerencie pacotes personalizados de equipamentos</p>
                </div>

                {canManagePackages() && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => resetForm()}>
                                <Plus className="mr-2 h-4 w-4" />
                                Novo Pacote
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingPackage ? 'Editar Pacote' : 'Novo Pacote'}
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome do Pacote *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ex: Pacote Apresentação"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Descrição</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Descreva o pacote..."
                                        rows={3}
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="is_template"
                                        checked={formData.is_template}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_template: e.target.checked }))}
                                        className="rounded"
                                    />
                                    <Label htmlFor="is_template">Usar como template</Label>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Equipamentos do Pacote</h3>

                                    <div className="grid grid-cols-12 gap-2 mb-3">
                                        <div className="col-span-6">
                                            <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione equipamento" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {equipments.map(eq => (
                                                        <SelectItem key={eq.id} value={eq.id}>
                                                            {eq.brand} {eq.model} - {eq.serialNumber}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={itemQuantity}
                                                onChange={(e) => setItemQuantity(parseInt(e.target.value))}
                                                placeholder="Qtd"
                                            />
                                        </div>
                                        <div className="col-span-2 flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={itemOptional}
                                                onChange={(e) => setItemOptional(e.target.checked)}
                                                className="rounded mr-1"
                                            />
                                            <span className="text-sm">Opcional</span>
                                        </div>
                                        <div className="col-span-2">
                                            <Button type="button" onClick={handleAddItem} className="w-full">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {formData.items.length > 0 && (
                                        <div className="space-y-2">
                                            {formData.items.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                                    <span className="text-sm">
                                                        {getEquipmentName(item)} (x{item.quantity})
                                                        {item.is_optional && <Badge variant="outline" className="ml-2">Opcional</Badge>}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveItem(item.equipment_id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit">
                                        {editingPackage ? 'Atualizar' : 'Criar'} Pacote
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map(pkg => (
                    <Card key={pkg.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                                </div>
                                <div className="flex gap-1">
                                    {pkg.is_available ? (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-red-500" />
                                    )}
                                </div>
                            </div>
                            <CardDescription>{pkg.description || 'Sem descrição'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    {pkg.is_template && <Badge variant="secondary">Template</Badge>}
                                    {pkg.is_active ? (
                                        <Badge variant="default">Ativo</Badge>
                                    ) : (
                                        <Badge variant="destructive">Inativo</Badge>
                                    )}
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    <p>Total de itens: {pkg.total_items}</p>
                                    <p>Criado por: {pkg.created_by_name || 'Sistema'}</p>
                                </div>

                                {pkg.items && pkg.items.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold">Equipamentos:</p>
                                        {pkg.items.map(item => (
                                            <p key={item.id} className="text-xs text-muted-foreground">
                                                • {item.equipment.brand} {item.equipment.model} (x{item.quantity})
                                            </p>
                                        ))}
                                    </div>
                                )}

                                {canManagePackages() && (
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditPackage(pkg)}
                                            className="flex-1"
                                        >
                                            <Edit className="h-4 w-4 mr-1" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(pkg.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {packages.length === 0 && (
                <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum pacote encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                        Crie seu primeiro pacote de equipamentos
                    </p>
                    {canManagePackages() && (
                        <Button onClick={() => setIsDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Criar Pacote
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
