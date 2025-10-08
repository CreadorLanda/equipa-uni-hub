from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import LoanRequest, Loan
from .serializers import (
    LoanRequestSerializer, LoanRequestListSerializer,
    LoanRequestApprovalSerializer, LoanRequestConfirmPickupSerializer
)
from notifications.models import Notification
from .services import LoanNotificationService


class LoanRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de solicitações de empréstimo
    """
    queryset = LoanRequest.objects.select_related(
        'user', 'tecnico_responsavel', 'aprovado_por'
    ).prefetch_related('equipments').all()
    serializer_class = LoanRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'user', 'tecnico_responsavel']
    search_fields = ['user__name', 'purpose']
    ordering_fields = ['created_at', 'expected_return_date']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """
        Retorna o serializer apropriado baseado na ação
        """
        if self.action == 'list':
            return LoanRequestListSerializer
        elif self.action in ['aprovar', 'rejeitar']:
            return LoanRequestApprovalSerializer
        elif self.action == 'confirmar_levantamento':
            return LoanRequestConfirmPickupSerializer
        return LoanRequestSerializer
    
    def get_queryset(self):
        """
        Filtra solicitações baseado nas permissões do usuário
        """
        queryset = LoanRequest.objects.select_related(
            'user', 'tecnico_responsavel', 'aprovado_por'
        ).prefetch_related('equipments').all()
        
        user = self.request.user
        
        # Coordenadores (reitoria) veem todas
        if user.role == 'coordenador':
            return queryset
        
        # Técnicos veem todas as solicitações
        elif user.role == 'tecnico':
            return queryset
        
        # Outros usuários (docentes, secretários) veem apenas suas próprias
        else:
            return queryset.filter(user=user)
    
    def perform_create(self, serializer):
        """
        Personaliza a criação de solicitação
        """
        # Docentes só podem criar solicitações para si mesmos
        if self.request.user.role == 'docente':
            loan_request = serializer.save(user=self.request.user)
        else:
            loan_request = serializer.save()
        
        # Envia notificação para a reitoria (coordenadores) sobre nova solicitação
        try:
            self._send_new_request_notification(loan_request)
        except Exception as e:
            print(f"Erro ao enviar notificação de nova solicitação: {e}")
    
    def perform_update(self, serializer):
        """
        Personaliza a atualização de solicitação
        """
        loan_request = self.get_object()
        
        # Não permite editar solicitações já aprovadas/rejeitadas
        if loan_request.status != 'pendente':
            raise permissions.PermissionDenied(
                'Não é possível editar solicitações já processadas.'
            )
        
        # Docentes só podem editar suas próprias solicitações
        if self.request.user.role == 'docente' and loan_request.user != self.request.user:
            raise permissions.PermissionDenied(
                'Você só pode editar suas próprias solicitações.'
            )
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Personaliza a exclusão de solicitação
        """
        # Apenas o criador ou coordenador podem excluir
        if self.request.user.role not in ['coordenador'] and instance.user != self.request.user:
            raise permissions.PermissionDenied(
                'Você não tem permissão para excluir esta solicitação.'
            )
        
        # Não permite excluir solicitações autorizadas com levantamento confirmado
        if instance.status == 'autorizado' and instance.confirmado_pelo_tecnico:
            raise permissions.PermissionDenied(
                'Não é possível excluir solicitações com levantamento confirmado.'
            )
        
        super().perform_destroy(instance)
    
    @action(detail=False, methods=['get'])
    def pendentes(self, request):
        """
        Lista apenas solicitações pendentes
        """
        pending_requests = self.get_queryset().filter(status='pendente')
        
        page = self.paginate_queryset(pending_requests)
        if page is not None:
            serializer = LoanRequestListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = LoanRequestListSerializer(pending_requests, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def autorizadas(self, request):
        """
        Lista solicitações autorizadas
        """
        authorized_requests = self.get_queryset().filter(status='autorizado')
        
        page = self.paginate_queryset(authorized_requests)
        if page is not None:
            serializer = LoanRequestListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = LoanRequestListSerializer(authorized_requests, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def aprovar(self, request, pk=None):
        """
        Aprova uma solicitação de empréstimo (apenas coordenadores)
        """
        loan_request = self.get_object()
        
        # Verifica permissões
        if request.user.role != 'coordenador':
            return Response(
                {'error': 'Apenas coordenadores (reitoria) podem aprovar solicitações.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if loan_request.status != 'pendente':
            return Response(
                {'error': 'Esta solicitação já foi processada.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LoanRequestApprovalSerializer(
            data=request.data,
            context={'action': 'aprovar'}
        )
        
        if serializer.is_valid():
            motivo = serializer.validated_data.get('motivo', 'Solicitação aprovada.')
            loan_request.aprovar(request.user, motivo)
            
            # Envia notificação de aprovação
            try:
                self._send_approval_notification(loan_request)
            except Exception as e:
                print(f"Erro ao enviar notificação de aprovação: {e}")
            
            return Response(
                {
                    'message': 'Solicitação aprovada com sucesso.',
                    'loan_request': LoanRequestSerializer(loan_request).data
                },
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def rejeitar(self, request, pk=None):
        """
        Rejeita uma solicitação de empréstimo (apenas coordenadores)
        """
        loan_request = self.get_object()
        
        # Verifica permissões
        if request.user.role != 'coordenador':
            return Response(
                {'error': 'Apenas coordenadores (reitoria) podem rejeitar solicitações.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if loan_request.status != 'pendente':
            return Response(
                {'error': 'Esta solicitação já foi processada.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LoanRequestApprovalSerializer(
            data=request.data,
            context={'action': 'rejeitar'}
        )
        
        if serializer.is_valid():
            motivo = serializer.validated_data.get('motivo')
            loan_request.rejeitar(request.user, motivo)
            
            # Envia notificação de rejeição
            try:
                self._send_rejection_notification(loan_request)
            except Exception as e:
                print(f"Erro ao enviar notificação de rejeição: {e}")
            
            return Response(
                {
                    'message': 'Solicitação rejeitada.',
                    'loan_request': LoanRequestSerializer(loan_request).data
                },
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def confirmar_levantamento(self, request, pk=None):
        """
        Confirma que o utente levantou os equipamentos (apenas técnicos)
        """
        loan_request = self.get_object()
        
        # Verifica permissões
        if request.user.role not in ['tecnico', 'secretario', 'coordenador']:
            return Response(
                {'error': 'Apenas técnicos podem confirmar o levantamento.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if loan_request.status != 'autorizado':
            return Response(
                {'error': 'Esta solicitação precisa estar autorizada para confirmar levantamento.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if loan_request.confirmado_pelo_tecnico:
            return Response(
                {'error': 'O levantamento já foi confirmado.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LoanRequestConfirmPickupSerializer(data=request.data)
        
        if serializer.is_valid():
            loan_request.confirmar_levantamento(request.user)

            # Cria empréstimos para cada equipamento selecionado na solicitação
            equipments = list(loan_request.equipments.all())
            if not equipments:
                return Response(
                    {
                        'error': 'Esta solicitação não possui equipamentos selecionados para gerar empréstimos. Edite a solicitação e selecione equipamentos ou crie os empréstimos manualmente em /emprestimos.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            created_loans = []
            skipped = []
            for eq in equipments:
                try:
                    # Garante disponibilidade
                    if not eq.can_be_borrowed():
                        skipped.append({'equipment': str(eq), 'reason': 'indisponivel'})
                        continue

                    loan = Loan.objects.create(
                        user=loan_request.user,
                        equipment=eq,
                        expected_return_date=loan_request.expected_return_date,
                        expected_return_time=loan_request.expected_return_time,
                        purpose=loan_request.purpose,
                        notes=(loan_request.notes or '') + f"\n\nCriado da Solicitação #{loan_request.id}",
                        created_by=request.user,
                    )
                    created_loans.append(loan)

                    # Notificação por empréstimo criado
                    try:
                        LoanNotificationService.send_loan_created_notification(loan)
                    except Exception as notify_err:
                        print(f"Erro ao notificar criação de empréstimo #{loan.id}: {notify_err}")
                except Exception as create_err:
                    skipped.append({'equipment': str(eq), 'reason': str(create_err)})

            # Envia notificação de confirmação de levantamento
            try:
                self._send_pickup_confirmation_notification(loan_request)
            except Exception as e:
                print(f"Erro ao enviar notificação de confirmação: {e}")
            
            return Response(
                {
                    'message': 'Levantamento confirmado e empréstimos gerados com sucesso.' if created_loans else 'Levantamento confirmado, mas nenhum empréstimo pôde ser gerado.',
                    'loan_request': LoanRequestSerializer(loan_request).data,
                    'created_loans': [
                        {
                            'id': loan.id,
                            'equipment_name': loan.equipment_name,
                            'expected_return_date': loan.expected_return_date,
                        } for loan in created_loans
                    ],
                    'skipped': skipped,
                },
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _send_new_request_notification(self, loan_request):
        """
        Envia notificação para coordenadores sobre nova solicitação
        """
        from accounts.models import User
        
        coordenadores = User.objects.filter(role='coordenador', is_active=True)
        
        for coordenador in coordenadores:
            Notification.objects.create(
                user=coordenador,
                type='info',
                title='Nova Solicitação de Empréstimo',
                message=f'{loan_request.user_name} solicitou empréstimo de {loan_request.quantity} equipamentos. Aguarda aprovação da reitoria.',
                action_required=True
            )
    
    def _send_approval_notification(self, loan_request):
        """
        Envia notificação ao utente sobre aprovação
        """
        Notification.objects.create(
            user=loan_request.user,
            type='success',
            title='Solicitação Aprovada',
            message=f'Sua solicitação de empréstimo de {loan_request.quantity} equipamentos foi aprovada pela reitoria. Motivo: {loan_request.motivo_decisao or "Aprovado"}',
            action_required=False
        )
        
        # Notifica técnico responsável
        if loan_request.tecnico_responsavel:
            Notification.objects.create(
                user=loan_request.tecnico_responsavel,
                type='info',
                title='Solicitação Aprovada',
                message=f'Solicitação de {loan_request.user_name} foi aprovada. Prepare os equipamentos para levantamento.',
                action_required=True
            )
    
    def _send_rejection_notification(self, loan_request):
        """
        Envia notificação ao utente sobre rejeição
        """
        Notification.objects.create(
            user=loan_request.user,
            type='warning',
            title='Solicitação Rejeitada',
            message=f'Sua solicitação de empréstimo de {loan_request.quantity} equipamentos foi rejeitada. Motivo: {loan_request.motivo_decisao}',
            action_required=False
        )
    
    def _send_pickup_confirmation_notification(self, loan_request):
        """
        Envia notificação ao utente sobre confirmação de levantamento
        """
        Notification.objects.create(
            user=loan_request.user,
            type='success',
            title='Levantamento Confirmado',
            message=f'O técnico {loan_request.tecnico_name} confirmou o levantamento dos equipamentos. Devolução prevista para {loan_request.expected_return_date.strftime("%d/%m/%Y")}.',
            action_required=False
        )
