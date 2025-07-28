import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

interface Permissions {
  // Equipamentos
  canViewEquipments: boolean;
  canCreateEquipments: boolean;
  canEditEquipments: boolean;
  canDeleteEquipments: boolean;
  
  // Empréstimos
  canRequestLoans: boolean;
  canConfirmReturns: boolean;
  canViewAllLoans: boolean;
  canViewOwnLoans: boolean;
  
  // Reservas
  canMakeReservations: boolean;
  canViewAllReservations: boolean;
  canViewOwnReservations: boolean;
  
  // Relatórios
  canViewReports: boolean;
  canGenerateReports: boolean;
  
  // Notificações
  canManageNotifications: boolean;
  canViewNotifications: boolean;
  
  // Outros
  canManageMaintenance: boolean;
  canLoanForOthers: boolean; // Coordenador pode emprestar para estudantes
}

const rolePermissions: Record<UserRole, Permissions> = {
  tecnico: {
    // Técnico tem acesso total administrativo
    canViewEquipments: true,
    canCreateEquipments: true,
    canEditEquipments: true,
    canDeleteEquipments: true,
    canRequestLoans: false, // Não pode solicitar como usuário comum
    canConfirmReturns: true,
    canViewAllLoans: true,
    canViewOwnLoans: true,
    canMakeReservations: false, // Administra, não usa
    canViewAllReservations: true,
    canViewOwnReservations: true,
    canViewReports: true,
    canGenerateReports: true,
    canManageNotifications: true,
    canViewNotifications: true,
    canManageMaintenance: true,
    canLoanForOthers: false
  },
  docente: {
    // Docente - usuário comum
    canViewEquipments: true, // Só consulta
    canCreateEquipments: false,
    canEditEquipments: false,
    canDeleteEquipments: false,
    canRequestLoans: true,
    canConfirmReturns: false, // Só confirma próprias devoluções
    canViewAllLoans: false,
    canViewOwnLoans: true,
    canMakeReservations: true,
    canViewAllReservations: false,
    canViewOwnReservations: true,
    canViewReports: false,
    canGenerateReports: false,
    canManageNotifications: false,
    canViewNotifications: true,
    canManageMaintenance: false,
    canLoanForOthers: false
  },
  secretario: {
    // Secretário - mesmo que docente
    canViewEquipments: true,
    canCreateEquipments: false,
    canEditEquipments: false,
    canDeleteEquipments: false,
    canRequestLoans: true,
    canConfirmReturns: false,
    canViewAllLoans: false,
    canViewOwnLoans: true,
    canMakeReservations: true,
    canViewAllReservations: false,
    canViewOwnReservations: true,
    canViewReports: false,
    canGenerateReports: false,
    canManageNotifications: false,
    canViewNotifications: true,
    canManageMaintenance: false,
    canLoanForOthers: false
  },
  coordenador: {
    // Coordenador - como docente + poder emprestar para estudantes
    canViewEquipments: true,
    canCreateEquipments: false,
    canEditEquipments: false,
    canDeleteEquipments: false,
    canRequestLoans: true,
    canConfirmReturns: false,
    canViewAllLoans: false,
    canViewOwnLoans: true,
    canMakeReservations: true,
    canViewAllReservations: false,
    canViewOwnReservations: true,
    canViewReports: false, // Não pode acessar relatórios
    canGenerateReports: false,
    canManageNotifications: false,
    canViewNotifications: true,
    canManageMaintenance: false,
    canLoanForOthers: true // Pode emprestar para estudantes
  }
};

export const usePermissions = (): Permissions => {
  const { user } = useAuth();
  
  if (!user) {
    // Retorna permissões vazias se não estiver logado
    return Object.keys(rolePermissions.tecnico).reduce((acc, key) => {
      acc[key as keyof Permissions] = false;
      return acc;
    }, {} as Permissions);
  }
  
  return rolePermissions[user.role];
};