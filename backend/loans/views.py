from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from datetime import datetime, timedelta
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Loan
from .serializers import (
    LoanSerializer, LoanListSerializer, LoanReturnSerializer,
    LoanStatsSerializer, LoanConfirmPickupSerializer,
    LoanConfirmTecnicoSerializer, LoanConfirmUtenteSerializer,
    LoanCancelSerializer
)
from .services import LoanNotificationService


class LoanViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de empréstimos
    """
    queryset = Loan.objects.select_related('user', 'equipment').all()
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'user', 'equipment', 'equipment__type']
    search_fields = ['user__name', 'equipment__brand', 'equipment__model', 'purpose']
    ordering_fields = ['start_date', 'expected_return_date', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return LoanListSerializer
        elif self.action == 'return_equipment':
            return LoanReturnSerializer
        elif self.action == 'confirmar_tecnico':
            return LoanConfirmTecnicoSerializer
        elif self.action == 'confirmar_utente':
            return LoanConfirmUtenteSerializer
        elif self.action == 'cancelar':
            return LoanCancelSerializer
        return LoanSerializer
    
    def get_queryset(self):
        """
        Filtra empréstimos baseado nos parâmetros de consulta e permissões
        """
        queryset = Loan.objects.select_related('user', 'equipment').all()
        
        # Apenas técnico e coordenador veem todos. Demais (docente, secretário) veem apenas os próprios
        if self.request.user.role not in ['tecnico', 'coordenador']:
            queryset = queryset.filter(user=self.request.user)
        
        # Filtro por status de atraso
        overdue_only = self.request.query_params.get('overdue_only')
        if overdue_only and overdue_only.lower() == 'true':
            queryset = queryset.filter(
                status__in=['ativo', 'atrasado'],
                expected_return_date__lt=timezone.now().date()
            )
        
        # Filtro por período
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(start_date__gte=start_date)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(start_date__lte=end_date)
            except ValueError:
                pass
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Personaliza a criação de empréstimo
        """
        user_data = serializer.validated_data.get('user')
        
        # Se não é técnico, só pode criar empréstimos para si mesmo
        if self.request.user.role != 'tecnico':
            if user_data and user_data != self.request.user:
                raise permissions.PermissionDenied(
                    'Você só pode criar empréstimos para si mesmo. Apenas técnicos podem criar empréstimos para outros usuários.'
                )
            # Força o usuário como sendo o próprio usuário autenticado
            loan = serializer.save(user=self.request.user, created_by=self.request.user)
        else:
            # Técnico pode definir para qual usuário é o empréstimo
            loan = serializer.save(created_by=self.request.user)
        
        # Envia notificação de empréstimo criado (pendente)
        try:
            LoanNotificationService.send_loan_created_notification(loan)
        except Exception as e:
            # Log error but don't fail the loan creation
            print(f"Erro ao enviar notificação de empréstimo criado: {e}")
    
    def perform_update(self, serializer):
        """
        Personaliza a atualização de empréstimo
        """
        loan = self.get_object()
        
        # Docentes só podem editar seus próprios empréstimos
        if self.request.user.role == 'docente' and loan.user != self.request.user:
            raise permissions.PermissionDenied(
                'Você só pode editar seus próprios empréstimos.'
            )
        
        # Não permite editar empréstimos concluídos
        if loan.status == 'concluido':
            raise permissions.PermissionDenied(
                'Não é possível editar empréstimos já concluídos.'
            )
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Personaliza a exclusão de empréstimo
        """
        # Apenas coordenadores podem excluir empréstimos
        if self.request.user.role != 'coordenador':
            raise permissions.PermissionDenied(
                'Apenas coordenadores podem excluir empréstimos.'
            )
        
        # Não permite excluir empréstimos ativos
        if instance.status in ['ativo', 'atrasado']:
            raise permissions.PermissionDenied(
                'Não é possível excluir empréstimos ativos. Faça a devolução primeiro.'
            )
        
        super().perform_destroy(instance)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Lista apenas empréstimos ativos
        """
        active_loans = self.get_queryset().filter(status__in=['ativo', 'atrasado'])
        
        page = self.paginate_queryset(active_loans)
        if page is not None:
            serializer = LoanListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = LoanListSerializer(active_loans, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """
        Lista empréstimos em atraso
        """
        overdue_loans = self.get_queryset().filter(
            status__in=['ativo', 'atrasado'],
            expected_return_date__lt=timezone.now().date()
        )
        
        page = self.paginate_queryset(overdue_loans)
        if page is not None:
            serializer = LoanListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = LoanListSerializer(overdue_loans, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def return_equipment(self, request, pk=None):
        """
        Processa a devolução de equipamento
        """
        loan = self.get_object()
        
        # Verifica permissões
        if (request.user.role == 'docente' and loan.user != request.user):
            return Response(
                {'error': 'Você só pode devolver seus próprios empréstimos.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if loan.status not in ['ativo', 'atrasado']:
            return Response(
                {'error': 'Este empréstimo não está ativo.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LoanReturnSerializer(
            data=request.data, 
            context={'loan': loan}
        )
        
        if serializer.is_valid():
            returned_loan = serializer.save()
            
            # Envia notificação de devolução
            try:
                LoanNotificationService.send_loan_returned_notification(returned_loan)
            except Exception as e:
                # Log error but don't fail the return
                print(f"Erro ao enviar notificação de devolução: {e}")
            
            loan_serializer = LoanSerializer(returned_loan)
            return Response(
                {
                    'message': 'Equipamento devolvido com sucesso.',
                    'loan': loan_serializer.data
                }, 
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Retorna estatísticas dos empréstimos
        """
        queryset = self.get_queryset()
        
        # Estatísticas básicas
        total_loans = queryset.count()
        stats_by_status = queryset.values('status').annotate(count=Count('id'))
        
        # Organiza as estatísticas
        status_counts = {item['status']: item['count'] for item in stats_by_status}
        
        # Estatísticas por período
        now = timezone.now().date()
        start_of_month = now.replace(day=1)
        start_of_week = now - timedelta(days=now.weekday())
        
        loans_this_month = queryset.filter(start_date__gte=start_of_month).count()
        loans_this_week = queryset.filter(start_date__gte=start_of_week).count()
        
        # Top usuários (apenas para coordenadores e secretários)
        top_borrowers = []
        most_borrowed_equipment = []
        
        if request.user.role in ['coordenador', 'secretario']:
            top_borrowers = list(
                queryset.values('user__name')
                .annotate(loan_count=Count('id'))
                .order_by('-loan_count')[:5]
            )
            
            most_borrowed_equipment = list(
                queryset.values('equipment__brand', 'equipment__model')
                .annotate(loan_count=Count('id'))
                .order_by('-loan_count')[:5]
            )
        
        stats_data = {
            'total_loans': total_loans,
            'active_loans': status_counts.get('ativo', 0),
            'overdue_loans': status_counts.get('atrasado', 0),
            'completed_loans': status_counts.get('concluido', 0),
            'cancelled_loans': status_counts.get('cancelado', 0),
            'loans_this_month': loans_this_month,
            'loans_this_week': loans_this_week,
            'top_borrowers': top_borrowers,
            'most_borrowed_equipment': most_borrowed_equipment,
        }
        
        serializer = LoanStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_loans(self, request):
        """
        Lista empréstimos do usuário autenticado
        """
        my_loans = self.get_queryset().filter(user=request.user)
        
        page = self.paginate_queryset(my_loans)
        if page is not None:
            serializer = LoanListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = LoanListSerializer(my_loans, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def confirmar_levantamento(self, request, pk=None):
        """
        Retrocompatibilidade: confirma como técnico.
        Se utente já confirmou, ativa o empréstimo.
        """
        return self.confirmar_tecnico(request, pk)

    @action(detail=True, methods=['post'])
    def confirmar_tecnico(self, request, pk=None):
        """
        Técnico confirma o levantamento.
        Se utente já confirmou, ativa o empréstimo.
        """
        loan = self.get_object()

        if request.user.role not in ['tecnico', 'secretario', 'coordenador']:
            return Response(
                {'error': 'Apenas técnicos, secretários ou coordenadores podem confirmar como técnico.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if loan.status not in ['pendente']:
            return Response(
                {'error': 'Este empréstimo não está pendente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if loan.confirmado_tecnico:
            return Response(
                {'error': 'O técnico já confirmou este levantamento.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = LoanConfirmTecnicoSerializer(data=request.data)
        if serializer.is_valid():
            loan.confirmar_tecnico(request.user)

            notes = serializer.validated_data.get('notes', '')
            if notes:
                existing_notes = loan.notes or ''
                loan.notes = f"{existing_notes}\n\nConfirmação técnica: {notes}".strip()
                loan.save()

            message = 'Confirmação técnica registada. '
            if loan.confirmado_levantamento:
                message += 'Utente já tinha confirmado. Empréstimo ativado!'
                try:
                    LoanNotificationService.send_pickup_confirmed_notification(loan)
                except Exception as e:
                    print(f"Erro ao enviar notificação: {e}")
            else:
                message += 'Aguardando confirmação do utente.'

            loan_serializer = LoanSerializer(loan)
            return Response({'message': message, 'loan': loan_serializer.data}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def confirmar_utente(self, request, pk=None):
        """
        Utente confirma o levantamento.
        Se técnico já confirmou, ativa o empréstimo.
        """
        loan = self.get_object()

        if loan.user != request.user:
            return Response(
                {'error': 'Apenas o utente pode confirmar o seu próprio levantamento.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if loan.status not in ['pendente']:
            return Response(
                {'error': 'Este empréstimo não está pendente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if loan.confirmado_utente:
            return Response(
                {'error': 'Já confirmou o levantamento.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = LoanConfirmUtenteSerializer(data=request.data)
        if serializer.is_valid():
            loan.confirmar_utente()

            notes = serializer.validated_data.get('notes', '')
            if notes:
                existing_notes = loan.notes or ''
                loan.notes = f"{existing_notes}\n\nConfirmação utente: {notes}".strip()
                loan.save()

            message = 'Confirmação registada. '
            if loan.confirmado_levantamento:
                message += 'Técnico já tinha confirmado. Empréstimo ativado!'
                try:
                    LoanNotificationService.send_pickup_confirmed_notification(loan)
                except Exception as e:
                    print(f"Erro ao enviar notificação: {e}")
            else:
                message += 'Aguardando confirmação do técnico.'

            loan_serializer = LoanSerializer(loan)
            return Response({'message': message, 'loan': loan_serializer.data}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """
        Cancela um empréstimo pendente.
        """
        loan = self.get_object()

        if loan.status != 'pendente':
            return Response(
                {'error': 'Apenas empréstimos pendentes podem ser cancelados.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user != loan.user and request.user.role not in ['tecnico', 'coordenador']:
            return Response(
                {'error': 'Apenas o utente, técnico ou coordenador pode cancelar.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = LoanCancelSerializer(data=request.data)
        if serializer.is_valid():
            loan.status = 'cancelado'
            motivo = serializer.validated_data.get('motivo', '')
            if motivo:
                loan.notes = f"{loan.notes or ''}\n\nCancelado: {motivo}".strip()
            loan.save()

            loan_serializer = LoanSerializer(loan)
            return Response(
                {'message': 'Empréstimo cancelado com sucesso.', 'loan': loan_serializer.data},
                status=status.HTTP_200_OK
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
