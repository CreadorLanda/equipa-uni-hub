export type UserRole = 'tecnico' | 'docente' | 'secretario' | 'coordenador';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  academic_degree?: string;
  position?: string;
  contact?: string;
  address?: string;
  area?: string;
  is_active?: boolean;
  is_external?: boolean;
  external_id?: string;
  created_by?: string;
  created_by_name?: string;
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
  color?: string;
  category?: string;
  updatedAt?: string;
}

export type EquipmentType = 'notebook' | 'desktop' | 'tablet' | 'projetor' | 'impressora' | 'monitor' | 'outros';

export type EquipmentStatus = 'disponivel' | 'emprestado' | 'reservado' | 'manutencao' | 'inativo';

export interface Loan {
  id: string;
  userId: string;
  userName: string;
  equipmentId?: string;
  equipmentName: string;
  pacote?: number;
  pacoteDetail?: EquipmentPackage;
  startDate: string;
  startTime: string;
  expectedReturnDate: string;
  expectedReturnTime?: string;
  actualReturnDate?: string;
  status: LoanStatus;
  purpose: string;
  notes?: string;
  createdBy?: string;
  createdByUserName?: string;
  tecnicoEntrega?: string;
  tecnicoEntregaName?: string;

  // Dual confirmation
  confirmadoTecnico: boolean;
  dataConfirmacaoTecnico?: string;
  confirmadoUtente: boolean;
  dataConfirmacaoUtente?: string;
  confirmadoLevantamento: boolean;
  dataConfirmacaoLevantamento?: string;

  // Same-day return
  devolucaoMesmoDia: boolean;
  dataPrevistaDevolucao?: string;
}

export type LoanStatus = 'pendente' | 'ativo' | 'atrasado' | 'concluido' | 'cancelado';

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

export interface LoanRequest {
  id: string;
  userId: string;
  userName: string;
  equipments: string[];
  equipmentsDetail?: Equipment[];
  pacote?: number;
  pacoteDetail?: EquipmentPackage;
  purpose: string;
  expectedReturnDate: string;
  expectedReturnTime?: string;
  notes?: string;
  status: LoanRequestStatus;
  aprovadoPor?: string;
  aprovadorName?: string;
  motivoDecisao?: string;
  dataDecisao?: string;

  // Cancel
  canceladoPor?: string;
  canceladorName?: string;
  dataCancelamento?: string;
  motivoCancelamento?: string;

  tecnicoResponsavel?: string;
  tecnicoName?: string;
  dataLevantamento?: string;
  confirmadoPeloTecnico: boolean;
  confirmadoPeloUtente: boolean;
  dataConfirmacaoUtente?: string;
  confirmacaoCompleta: boolean;

  // Same-day return
  devolucaoMesmoDia: boolean;
  diasPrevistosDevolucao?: number;

  createdAt: string;
  updatedAt: string;
}

export type LoanRequestStatus = 'pendente' | 'autorizado' | 'rejeitado' | 'cancelado';

export interface PackageItem {
  id: string;
  equipment: Equipment;
  equipment_id: string;
  quantity: number;
  is_optional: boolean;
  created_at: string;
}

export interface EquipmentPackage {
  id: string;
  name: string;
  description?: string;
  created_by?: string;
  created_by_name?: string;
  is_template: boolean;
  is_active: boolean;
  items: PackageItem[];
  total_items: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  type: 'alert' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  createdAt: string;
}

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