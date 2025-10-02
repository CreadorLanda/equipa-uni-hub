import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  UserCircle, 
  Mail, 
  Phone, 
  MapPin,
  Briefcase,
  GraduationCap,
  Building,
  Edit,
  Save,
  X,
  Key,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usersAPI, authAPI } from '@/lib/api';
import { User, UserRole } from '@/types';

const roleLabels: Record<UserRole, string> = {
  tecnico: 'Técnico',
  docente: 'Docente',
  secretario: 'Secretário',
  coordenador: 'Coordenador'
};

export const Perfil = () => {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    academic_degree: '',
    contact: '',
    address: ''
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setUserData(user);
      setFormData({
        academic_degree: user.academic_degree || '',
        contact: user.contact || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setLoading(true);
    
    try {
      const updatedUser = await usersAPI.update(user.id, {
        academic_degree: formData.academic_degree,
        contact: formData.contact,
        address: formData.address
      });
      
      setUserData(updatedUser);
      setIsEditing(false);
      
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: "Não foi possível atualizar suas informações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 8 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      await authAPI.changePassword(passwordData.oldPassword, passwordData.newPassword);
      
      setIsChangingPassword(false);
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      let description = "Não foi possível alterar sua senha.";
      if (errorMessage.includes('senha atual') || errorMessage.includes('incorrect')) {
        description = "A senha atual está incorreta.";
      }
      
      toast({
        title: "Erro ao alterar senha",
        description,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    if (user) {
      setFormData({
        academic_degree: user.academic_degree || '',
        contact: user.contact || '',
        address: user.address || ''
      });
    }
    setIsEditing(false);
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Visualize e edite suas informações pessoais
          </p>
        </div>
        
        <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Key className="w-4 h-4 mr-2" />
              Alterar Senha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Senha</DialogTitle>
              <DialogDescription>
                Digite sua senha atual e a nova senha desejada.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Senha Atual *</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    'Alterar Senha'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Informações Básicas (Não Editáveis) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="w-5 h-5" />
            Informações Básicas
          </CardTitle>
          <CardDescription>
            Estas informações são gerenciadas pelo administrador do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground text-sm">Nome Completo</Label>
              <p className="text-lg font-medium mt-1">{userData.name}</p>
            </div>

            <div>
              <Label className="text-muted-foreground text-sm flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Email
              </Label>
              <p className="text-lg font-medium mt-1">{userData.email}</p>
            </div>

            <div>
              <Label className="text-muted-foreground text-sm">Função</Label>
              <div className="mt-1">
                <Badge className="text-sm">
                  {roleLabels[userData.role]}
                </Badge>
              </div>
            </div>

            {userData.position && (
              <div>
                <Label className="text-muted-foreground text-sm flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  Cargo
                </Label>
                <p className="text-lg font-medium mt-1">{userData.position}</p>
              </div>
            )}

            {(userData.area || userData.department) && (
              <div>
                <Label className="text-muted-foreground text-sm flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  Área/Departamento
                </Label>
                <p className="text-lg font-medium mt-1">
                  {userData.area}
                  {userData.area && userData.department && ' - '}
                  {userData.department}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações Editáveis */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Informações Editáveis
              </CardTitle>
              <CardDescription>
                Você pode atualizar estas informações
              </CardDescription>
            </div>
            
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="academic_degree" className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4" />
                  Grau Académico
                </Label>
                <Input
                  id="academic_degree"
                  value={formData.academic_degree}
                  onChange={(e) => setFormData(prev => ({ ...prev, academic_degree: e.target.value }))}
                  placeholder="Ex: Licenciado, Mestrado, Doutorado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact" className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  Contacto
                </Label>
                <Input
                  id="contact"
                  value={formData.contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="Ex: +244 123 456 789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Morada
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Endereço completo..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={cancelEdit}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  Grau Académico
                </Label>
                <p className="text-lg font-medium mt-1">
                  {userData.academic_degree || (
                    <span className="text-muted-foreground text-sm">Não informado</span>
                  )}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Contacto
                </Label>
                <p className="text-lg font-medium mt-1">
                  {userData.contact || (
                    <span className="text-muted-foreground text-sm">Não informado</span>
                  )}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Morada
                </Label>
                <p className="text-lg font-medium mt-1">
                  {userData.address || (
                    <span className="text-muted-foreground text-sm">Não informado</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Gerencie a segurança da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Senha</p>
              <p className="text-sm text-muted-foreground">
                Última alteração: Não disponível
              </p>
            </div>
            <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
