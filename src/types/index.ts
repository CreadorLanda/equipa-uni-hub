export type UserRole = 'tecnico' | 'docente' | 'secretario' | 'coordenador';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

export interface Equipment {
  id: string;
  brand: string;
  model: string;
  type: EquipmentType;
  status: EquipmentStatus;
  serialNumber: string;
  acquisitionDate: string;
  description?: string;
  location?: string;
}

export type EquipmentType = 'notebook' | 'desktop' | 'tablet' | 'projetor' | 'impressora' | 'monitor' | 'outros';

export type EquipmentStatus = 'disponivel' | 'emprestado' | 'reservado' | 'manutencao' | 'inativo';

export interface Loan {
  id: string;
  userId: string;
  userName: string;
  equipmentId: string;
  equipmentName: string;
  startDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: LoanStatus;
  purpose: string;
  notes?: string;
}

export type LoanStatus = 'ativo' | 'atrasado' | 'concluido' | 'cancelado';

export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  equipmentId: string;
  equipmentName: string;
  reservationDate: string;
  expectedPickupDate: string;
  status: ReservationStatus;
  purpose: string;
  notes?: string;
}

export type ReservationStatus = 'ativa' | 'confirmada' | 'cancelada' | 'expirada';

export interface DashboardStats {
  totalEquipments: number;
  availableEquipments: number;
  loanedEquipments: number;
  maintenanceEquipments: number;
  activeLoans: number;
  overdueLoans: number;
  completedLoans: number;
  activeReservations: number;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading?: boolean;
}