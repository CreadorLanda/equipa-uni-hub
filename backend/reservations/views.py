from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from datetime import datetime, timedelta
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Reservation
from .serializers import (
    ReservationSerializer, ReservationListSerializer,
    ReservationConfirmSerializer, ReservationCancelSerializer,
    ReservationToLoanSerializer, ReservationStatsSerializer
)
from loans.serializers import LoanSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de reservas
    """
    queryset = Reservation.objects.select_related('user', 'equipment').all()
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'user', 'equipment', 'equipment__type']
    search_fields = ['user__name', 'equipment__brand', 'equipment__model', 'purpose']
    ordering_fields = ['reservation_date', 'expected_pickup_date', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """
        Retorna o serializer apropriado baseado na ação
        """
        if self.action == 'list':
            return ReservationListSerializer
        elif self.action == 'confirm':
            return ReservationConfirmSerializer
        elif self.action == 'cancel':
            return ReservationCancelSerializer
        elif self.action == 'convert_to_loan':
            return ReservationToLoanSerializer
        return ReservationSerializer
    
    def get_queryset(self):
        """
        Filtra reservas baseado nos parâmetros de consulta e permissões
        """
        queryset = Reservation.objects.select_related('user', 'equipment').all()
        
        # Docentes só podem ver suas próprias reservas
        if self.request.user.role == 'docente':
            queryset = queryset.filter(user=self.request.user)
        
        # Filtro por reservas expirando em breve
        expiring_soon = self.request.query_params.get('expiring_soon')
        if expiring_soon and expiring_soon.lower() == 'true':
            tomorrow = timezone.now().date() + timedelta(days=1)
            queryset = queryset.filter(
                status='ativa',
                expected_pickup_date__lte=tomorrow
            )
        
        # Filtro por período
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(reservation_date__gte=start_date)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(reservation_date__lte=end_date)
            except ValueError:
                pass
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Personaliza a criação de reserva
        """
        # Docentes só podem criar reservas para si mesmos
        if self.request.user.role == 'docente':
            serializer.save(user=self.request.user)
        else:
            serializer.save()
    
    def perform_update(self, serializer):
        """
        Personaliza a atualização de reserva
        """
        reservation = self.get_object()
        
        # Docentes só podem editar suas próprias reservas
        if self.request.user.role == 'docente' and reservation.user != self.request.user:
            raise permissions.PermissionDenied(
                'Você só pode editar suas próprias reservas.'
            )
        
        # Não permite editar reservas confirmadas ou canceladas
        if reservation.status in ['confirmada', 'cancelada', 'expirada']:
            raise permissions.PermissionDenied(
                f'Não é possível editar reservas {reservation.get_status_display().lower()}.'
            )
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Personaliza a exclusão de reserva
        """
        # Apenas coordenadores podem excluir reservas
        if self.request.user.role != 'coordenador':
            raise permissions.PermissionDenied(
                'Apenas coordenadores podem excluir reservas.'
            )
        
        super().perform_destroy(instance)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Lista apenas reservas ativas
        """
        active_reservations = self.get_queryset().filter(status__in=['ativa', 'confirmada'])
        
        page = self.paginate_queryset(active_reservations)
        if page is not None:
            serializer = ReservationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ReservationListSerializer(active_reservations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """
        Lista reservas que expiram em breve
        """
        tomorrow = timezone.now().date() + timedelta(days=1)
        expiring_reservations = self.get_queryset().filter(
            status='ativa',
            expected_pickup_date__lte=tomorrow
        )
        
        page = self.paginate_queryset(expiring_reservations)
        if page is not None:
            serializer = ReservationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ReservationListSerializer(expiring_reservations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """
        Confirma uma reserva
        """
        reservation = self.get_object()
        
        # Verifica permissões
        if request.user.role not in ['tecnico', 'secretario', 'coordenador']:
            return Response(
                {'error': 'Apenas técnicos, secretários e coordenadores podem confirmar reservas.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if reservation.status != 'ativa':
            return Response(
                {'error': 'Apenas reservas ativas podem ser confirmadas.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ReservationConfirmSerializer(
            data=request.data, 
            context={'reservation': reservation}
        )
        
        if serializer.is_valid():
            confirmed_reservation = serializer.save()
            reservation_serializer = ReservationSerializer(confirmed_reservation)
            return Response(
                {
                    'message': 'Reserva confirmada com sucesso.',
                    'reservation': reservation_serializer.data
                }, 
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancela uma reserva
        """
        reservation = self.get_object()
        
        # Verifica permissões
        if (request.user.role == 'docente' and reservation.user != request.user):
            return Response(
                {'error': 'Você só pode cancelar suas próprias reservas.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if reservation.status not in ['ativa', 'confirmada']:
            return Response(
                {'error': 'Apenas reservas ativas ou confirmadas podem ser canceladas.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ReservationCancelSerializer(
            data=request.data, 
            context={'reservation': reservation}
        )
        
        if serializer.is_valid():
            cancelled_reservation = serializer.save()
            reservation_serializer = ReservationSerializer(cancelled_reservation)
            return Response(
                {
                    'message': 'Reserva cancelada com sucesso.',
                    'reservation': reservation_serializer.data
                }, 
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def convert_to_loan(self, request, pk=None):
        """
        Converte uma reserva em empréstimo
        """
        reservation = self.get_object()
        
        # Verifica permissões
        if request.user.role not in ['tecnico', 'secretario', 'coordenador']:
            return Response(
                {'error': 'Apenas técnicos, secretários e coordenadores podem converter reservas em empréstimos.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if reservation.status not in ['ativa', 'confirmada']:
            return Response(
                {'error': 'Apenas reservas ativas ou confirmadas podem ser convertidas em empréstimos.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ReservationToLoanSerializer(
            data=request.data, 
            context={'reservation': reservation}
        )
        
        if serializer.is_valid():
            loan = serializer.save()
            loan_serializer = LoanSerializer(loan)
            return Response(
                {
                    'message': 'Reserva convertida em empréstimo com sucesso.',
                    'loan': loan_serializer.data
                }, 
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Retorna estatísticas das reservas
        """
        queryset = self.get_queryset()
        
        # Estatísticas básicas
        total_reservations = queryset.count()
        stats_by_status = queryset.values('status').annotate(count=Count('id'))
        
        # Organiza as estatísticas
        status_counts = {item['status']: item['count'] for item in stats_by_status}
        
        # Estatísticas por período
        now = timezone.now().date()
        start_of_month = now.replace(day=1)
        start_of_week = now - timedelta(days=now.weekday())
        
        reservations_this_month = queryset.filter(reservation_date__gte=start_of_month).count()
        reservations_this_week = queryset.filter(reservation_date__gte=start_of_week).count()
        
        # Reservas expirando em breve
        tomorrow = now + timedelta(days=1)
        expiring_soon = list(
            queryset.filter(
                status='ativa',
                expected_pickup_date__lte=tomorrow
            ).values('id', 'user__name', 'equipment__brand', 'equipment__model', 'expected_pickup_date')[:10]
        )
        
        stats_data = {
            'total_reservations': total_reservations,
            'active_reservations': status_counts.get('ativa', 0),
            'confirmed_reservations': status_counts.get('confirmada', 0),
            'expired_reservations': status_counts.get('expirada', 0),
            'cancelled_reservations': status_counts.get('cancelada', 0),
            'reservations_this_month': reservations_this_month,
            'reservations_this_week': reservations_this_week,
            'expiring_soon': expiring_soon,
        }
        
        serializer = ReservationStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_reservations(self, request):
        """
        Lista reservas do usuário autenticado
        """
        my_reservations = self.get_queryset().filter(user=request.user)
        
        page = self.paginate_queryset(my_reservations)
        if page is not None:
            serializer = ReservationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ReservationListSerializer(my_reservations, many=True)
        return Response(serializer.data)
