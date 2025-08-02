from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from equipment.models import Equipment
from loans.models import Loan
from reservations.models import Reservation
from accounts.models import User


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Endpoint para estatísticas do dashboard
    """
    # Estatísticas de equipamentos
    equipment_stats = Equipment.objects.aggregate(
        total=Count('id'),
        available=Count('id', filter=Q(status='disponivel')),
        loaned=Count('id', filter=Q(status='emprestado')),
        reserved=Count('id', filter=Q(status='reservado')),
        maintenance=Count('id', filter=Q(status='manutencao')),
        inactive=Count('id', filter=Q(status='inativo')),
    )
    
    # Estatísticas de empréstimos
    loan_stats = Loan.objects.aggregate(
        total=Count('id'),
        active=Count('id', filter=Q(status='ativo')),
        overdue=Count('id', filter=Q(status='atrasado')),
        completed=Count('id', filter=Q(status='concluido')),
    )
    
    # Estatísticas de reservas
    reservation_stats = Reservation.objects.aggregate(
        total=Count('id'),
        active=Count('id', filter=Q(status='ativa')),
        confirmed=Count('id', filter=Q(status='confirmada')),
        expired=Count('id', filter=Q(status='expirada')),
        cancelled=Count('id', filter=Q(status='cancelada')),
    )
    
    # Estatísticas de usuários (apenas para coordenadores e secretários)
    user_stats = {}
    if request.user.role in ['coordenador', 'secretario']:
        user_stats = User.objects.aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(is_active=True)),
            tecnico=Count('id', filter=Q(role='tecnico')),
            docente=Count('id', filter=Q(role='docente')),
            secretario=Count('id', filter=Q(role='secretario')),
            coordenador=Count('id', filter=Q(role='coordenador')),
        )
    
    # Atividades recentes (últimos 7 dias)
    week_ago = timezone.now().date() - timedelta(days=7)
    recent_loans = Loan.objects.filter(created_at__date__gte=week_ago).count()
    recent_reservations = Reservation.objects.filter(created_at__date__gte=week_ago).count()
    
    # Empréstimos vencendo em breve (próximos 3 dias)
    three_days_ahead = timezone.now().date() + timedelta(days=3)
    loans_due_soon = Loan.objects.filter(
        status__in=['ativo', 'atrasado'],
        expected_return_date__lte=three_days_ahead
    ).count()
    
    # Reservas expirando em breve (próximos 2 dias)
    two_days_ahead = timezone.now().date() + timedelta(days=2)
    reservations_expiring_soon = Reservation.objects.filter(
        status='ativa',
        expected_pickup_date__lte=two_days_ahead
    ).count()
    
    # Monta a resposta com base no DashboardStats do TypeScript
    dashboard_data = {
        'totalEquipments': equipment_stats['total'],
        'availableEquipments': equipment_stats['available'],
        'loanedEquipments': equipment_stats['loaned'],
        'maintenanceEquipments': equipment_stats['maintenance'],
        'activeLoans': loan_stats['active'],
        'overdueLoans': loan_stats['overdue'],
        'completedLoans': loan_stats['completed'],
        'activeReservations': reservation_stats['active'],
        
        # Estatísticas adicionais
        'equipmentStats': equipment_stats,
        'loanStats': loan_stats,
        'reservationStats': reservation_stats,
        'userStats': user_stats,
        'recentActivity': {
            'recentLoans': recent_loans,
            'recentReservations': recent_reservations,
            'loansDueSoon': loans_due_soon,
            'reservationsExpiringSoon': reservations_expiring_soon,
        }
    }
    
    return Response(dashboard_data) 