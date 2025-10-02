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
  UserCircle,
  Loader2,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { User, UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/lib/api';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'docente', label: 'Docente' },
  { value: 'secretario', label: 'Secretário' },
  { value: 'coordenador', label: 'Coordenador' }
];

export const Utilizadores = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'docente' as UserRole,
    academic_degree: '',
    position: '',
    contact: '',
    address: '',
    area: '',
    department: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersAPI.list();
      setUsers(data.results || data);
    } catch (error) {
      console.error('Erro ao carregar utilizadores:', error);
      toast({
        title: "Erro ao carregar utilizadores",
        description: "Não foi possível carregar a lista de utilizadores.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canManageUsers = () => {
    return currentUser?.role === 'tecnico';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      tecnico: 'bg-primary text-primary-foreground',
      docente: 'bg-info text-info-foreground',
      secretario: 'bg-warning text-warning-foreground',
      coordenador: 'bg-success text-success-foreground'
    };

    return (
      <Badge className={colors[role]}>
        {roleOptions.find(r => r.value === role)?.label}
      </Badge>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManageUsers()) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para gerenciar utilizadores.",
        variant: "destructive"
      });
      return;
    }

    // Validação de senha ao criar novo usuário
    if (!editingUser && formData.password) {
      if (formData.password.length < 8) {
        toast({
          title: "Senha inválida",
          description: "A senha deve ter no mínimo 8 caracteres.",
          variant: "destructive"
        });
        return;
      }
      
      // Verifica se a senha é só números
      if (/^\d+$/.test(formData.password)) {
        toast({
          title: "Senha inválida",
          description: "A senha não pode ser inteiramente numérica. Use letras, números e caracteres especiais.",
          variant: "destructive"
        });
        return;
      }
      
      // Verifica se a senha é muito comum
      const commonPasswords = ['12345678', '123456789', 'password', 'senha123', 'admin123'];
      if (commonPasswords.includes(formData.password.toLowerCase())) {
        toast({
          title: "Senha inválida",
          description: "Esta senha é muito comum. Escolha uma senha mais segura.",
          variant: "destructive"
        });
        return;
      }
    }

    setSubmitting(true);
    
    try {
      if (editingUser) {
        // Update existing user
        const updatedUser = await usersAPI.update(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          academic_degree: formData.academic_degree,
          position: formData.position,
          contact: formData.contact,
          address: formData.address,
          area: formData.area,
          department: formData.department
        });
        
        setUsers(prev => prev.map(u => 
          u.id === editingUser.id ? updatedUser : u
        ));
        
        toast({
          title: "Utilizador atualizado!",
          description: "As informações foram salvas com sucesso.",
        });
      } else {
        // Create new user
        const newUser = await usersAPI.create({
          username: formData.email, // Backend espera username
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          academic_degree: formData.academic_degree,
          position: formData.position,
          contact: formData.contact,
          address: formData.address,
          area: formData.area,
          department: formData.department
        });
        
        setUsers(prev => [...prev, newUser]);
        
        toast({
          title: "Utilizador criado!",
          description: "O novo utilizador foi adicionado ao sistema.",
        });
      }
      
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar utilizador:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      let description = "Não foi possível salvar o utilizador. Verifique os dados.";
      
      // Parse erros específicos do backend
      if (errorMessage.includes('username')) {
        description = "Erro no nome de usuário. Verifique se o email é válido.";
      } else if (errorMessage.includes('senha é muito comum') || errorMessage.includes('inteiramente numérica')) {
        description = "Senha inválida. Use uma senha com pelo menos 8 caracteres, incluindo letras e números.";
      } else if (errorMessage.includes('email')) {
        description = "Este email já está em uso ou é inválido.";
      }
      
      toast({
        title: "Erro ao salvar",
        description,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'docente',
      academic_degree: '',
      position: '',
      contact: '',
      address: '',
      area: '',
      department: ''
    });
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      academic_degree: user.academic_degree || '',
      position: user.position || '',
      contact: user.contact || '',
      address: user.address || '',
      area: user.area || '',
      department: user.department || ''
    });
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (user: User) => {
    if (!canManageUsers()) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para alterar status de utilizadores.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (user.is_active) {
        await usersAPI.deactivate(user.id);
      } else {
        await usersAPI.activate(user.id);
      }
      
      setUsers(prev => prev.map(u => 
        u.id === user.id 
          ? { ...u, is_active: !u.is_active }
          : u
      ));
      
      toast({
        title: "Status alterado!",
        description: `Utilizador ${user.is_active ? 'desativado' : 'ativado'} com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro ao alterar status",
        description: "Não foi possível alterar o status do utilizador.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (user: User) => {
    if (!canManageUsers()) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para excluir utilizadores.",
        variant: "destructive"
      });
      return;
    }

    if (user.id === currentUser?.id) {
      toast({
        title: "Operação não permitida",
        description: "Você não pode excluir seu próprio utilizador.",
        variant: "destructive"
      });
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o utilizador ${user.name}?`)) {
      try {
        await usersAPI.delete(user.id);
        setUsers(prev => prev.filter(u => u.id !== user.id));
        toast({
          title: "Utilizador excluído!",
          description: "O utilizador foi removido do sistema.",
          variant: "destructive"
        });
      } catch (error) {
        console.error('Erro ao excluir utilizador:', error);
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o utilizador.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gestão de Utilizadores</h1>
          <p className="text-muted-foreground">
            Gerencie todos os utilizadores do sistema
          </p>
        </div>
        
        {canManageUsers() && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary" onClick={() => setEditingUser(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Utilizador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Utilizador' : 'Criar Novo Utilizador'}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do utilizador abaixo.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha Inicial *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required={!editingUser}
                      placeholder="Ex: Senha@123"
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo 8 caracteres. Deve conter letras e números. Evite senhas comuns como "12345678".
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Função *</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as UserRole }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academic_degree">Grau Académico</Label>
                    <Input
                      id="academic_degree"
                      value={formData.academic_degree}
                      onChange={(e) => setFormData(prev => ({ ...prev, academic_degree: e.target.value }))}
                      placeholder="Ex: Licenciado, Mestrado, Doutorado"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">Cargo</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="Ex: Professor, Coordenador"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contacto</Label>
                    <Input
                      id="contact"
                      value={formData.contact}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                      placeholder="Ex: +244 123 456 789"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="area">Área/Departamento</Label>
                    <Input
                      id="area"
                      value={formData.area}
                      onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                      placeholder="Ex: Informática, Ciências"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Morada</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Endereço completo..."
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
                        {editingUser ? 'Atualizando...' : 'Criando...'}
                      </>
                    ) : (
                      editingUser ? 'Atualizar' : 'Criar'
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
            Use os filtros abaixo para encontrar utilizadores específicos
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
                  placeholder="Nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as funções</SelectItem>
                  {roleOptions.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Utilizadores ({loading ? '...' : filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Carregando utilizadores...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhum utilizador encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {users.length === 0 
                  ? "Ainda não há utilizadores cadastrados no sistema."
                  : "Nenhum utilizador corresponde aos filtros aplicados."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                        {user.academic_degree && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {user.academic_degree}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.contact ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3" />
                          {user.contact}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.area || user.department ? (
                        <div className="text-sm">
                          {user.area && <p>{user.area}</p>}
                          {user.department && (
                            <p className="text-muted-foreground">{user.department}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active !== false ? "default" : "outline"}>
                        {user.is_active !== false ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canManageUsers() && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(user)}
                              title="Editar utilizador"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(user)}
                              title={user.is_active !== false ? 'Desativar utilizador' : 'Ativar utilizador'}
                              disabled={user.id === currentUser?.id}
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(user)}
                              title="Excluir utilizador"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {!canManageUsers() && (
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
