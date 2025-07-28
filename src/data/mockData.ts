import { Equipment, Loan, Reservation, DashboardStats } from '@/types';

export const mockEquipments: Equipment[] = [
  {
    id: '1',
    brand: 'Dell',
    model: 'Latitude 5520',
    type: 'notebook',
    status: 'disponivel',
    serialNumber: 'DL001',
    acquisitionDate: '2023-01-15',
    description: 'Notebook para uso acadêmico',
    location: 'Laboratório 1'
  },
  {
    id: '2',
    brand: 'HP',
    model: 'EliteDesk 800',
    type: 'desktop',
    status: 'emprestado',
    serialNumber: 'HP002',
    acquisitionDate: '2023-02-20',
    description: 'Desktop para desenvolvimento',
    location: 'Sala 201'
  },
  {
    id: '3',
    brand: 'Epson',
    model: 'PowerLite X49',
    type: 'projetor',
    status: 'reservado',
    serialNumber: 'EP003',
    acquisitionDate: '2023-03-10',
    description: 'Projetor para apresentações',
    location: 'Auditório'
  },
  {
    id: '4',
    brand: 'Apple',
    model: 'iPad Air',
    type: 'tablet',
    status: 'manutencao',
    serialNumber: 'AP004',
    acquisitionDate: '2023-04-05',
    description: 'Tablet para pesquisa de campo',
    location: 'Laboratório 2'
  },
  {
    id: '5',
    brand: 'Canon',
    model: 'PIXMA G3110',
    type: 'impressora',
    status: 'disponivel',
    serialNumber: 'CN005',
    acquisitionDate: '2023-05-12',
    description: 'Impressora multifuncional',
    location: 'Secretaria'
  }
];

export const mockLoans: Loan[] = [
  {
    id: '1',
    userId: '2',
    userName: 'Ana Santos',
    equipmentId: '2',
    equipmentName: 'HP EliteDesk 800',
    startDate: '2024-01-15',
    expectedReturnDate: '2024-01-22',
    status: 'ativo',
    purpose: 'Desenvolvimento de projeto de pesquisa',
    notes: 'Equipamento em bom estado'
  },
  {
    id: '2',
    userId: '4',
    userName: 'Maria Costa',
    equipmentId: '1',
    equipmentName: 'Dell Latitude 5520',
    startDate: '2024-01-10',
    expectedReturnDate: '2024-01-20',
    actualReturnDate: '2024-01-19',
    status: 'concluido',
    purpose: 'Apresentação em congresso',
    notes: 'Devolvido em perfeito estado'
  },
  {
    id: '3',
    userId: '3',
    userName: 'João Oliveira',
    equipmentId: '5',
    equipmentName: 'Canon PIXMA G3110',
    startDate: '2024-01-05',
    expectedReturnDate: '2024-01-12',
    status: 'atrasado',
    purpose: 'Impressão de documentos administrativos',
    notes: 'Aguardando devolução'
  }
];

export const mockReservations: Reservation[] = [
  {
    id: '1',
    userId: '2',
    userName: 'Ana Santos',
    equipmentId: '3',
    equipmentName: 'Epson PowerLite X49',
    reservationDate: '2024-01-18',
    expectedPickupDate: '2024-01-25',
    status: 'ativa',
    purpose: 'Palestra sobre sustentabilidade',
    notes: 'Reserva para evento especial'
  },
  {
    id: '2',
    userId: '4',
    userName: 'Maria Costa',
    equipmentId: '1',
    equipmentName: 'Dell Latitude 5520',
    reservationDate: '2024-01-20',
    expectedPickupDate: '2024-01-30',
    status: 'ativa',
    purpose: 'Trabalho de campo',
    notes: 'Necessário carregador extra'
  }
];

export const mockDashboardStats: DashboardStats = {
  totalEquipments: 5,
  availableEquipments: 2,
  loanedEquipments: 1,
  maintenanceEquipments: 1,
  activeLoans: 1,
  overdueLoans: 1,
  completedLoans: 1,
  activeReservations: 2
};