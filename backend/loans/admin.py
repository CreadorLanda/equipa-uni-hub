from django.contrib import admin
from django.utils import timezone
from .models import Loan, LoanRequest


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo Loan
    """
    list_display = [
        'equipment_or_package', 'user', 'start_date', 'expected_return_date',
        'actual_return_date', 'status', 'is_overdue', 'created_at'
    ]
    list_filter = [
        'status', 'start_date', 'expected_return_date',
        'user__role', 'created_at', 'devolucao_mesmo_dia'
    ]
    search_fields = [
        'user__name', 'user__email', 'equipment__brand',
        'equipment__model', 'equipment__serial_number', 'pacote__name', 'purpose'
    ]
    ordering = ['-created_at']
    readonly_fields = [
        'created_at', 'updated_at', 'is_overdue', 'days_overdue',
        'user_name', 'equipment_name', 'confirmado_levantamento', 'data_confirmacao_levantamento'
    ]

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('user', 'equipment', 'pacote', 'purpose')
        }),
        ('Datas', {
            'fields': ('start_date', 'expected_return_date', 'expected_return_time', 'actual_return_date')
        }),
        ('Devolução', {
            'fields': ('devolucao_mesmo_dia', 'data_prevista_devolucao'),
        }),
        ('Confirmação Dupla', {
            'fields': (
                'confirmado_tecnico', 'data_confirmacao_tecnico', 'tecnico_entrega',
                'confirmado_utente', 'data_confirmacao_utente',
                'confirmado_levantamento', 'data_confirmacao_levantamento'
            ),
        }),
        ('Status e Observações', {
            'fields': ('status', 'notes')
        }),
        ('Metadados', {
            'fields': (
                'created_by', 'created_at', 'updated_at',
                'is_overdue', 'days_overdue', 'user_name', 'equipment_name'
            ),
            'classes': ('collapse',)
        }),
    )

    def equipment_or_package(self, obj):
        if obj.equipment:
            return str(obj.equipment)
        if obj.pacote:
            return f"Pacote: {obj.pacote.name}"
        return '—'
    equipment_or_package.short_description = 'Equipamento/Pacote'
    
    actions = ['mark_as_returned', 'mark_as_overdue', 'mark_as_cancelled']
    
    def mark_as_returned(self, request, queryset):
        """
        Marca empréstimos como devolvidos
        """
        active_loans = queryset.filter(status__in=['ativo', 'atrasado'])
        
        for loan in active_loans:
            loan.return_equipment()
        
        updated = active_loans.count()
        
        if updated > 0:
            self.message_user(
                request, 
                f'{updated} empréstimo(s) marcado(s) como devolvido(s).'
            )
        else:
            self.message_user(
                request, 
                'Nenhum empréstimo ativo foi encontrado para devolução.',
                level='warning'
            )
    mark_as_returned.short_description = "Marcar como devolvido"
    
    def mark_as_overdue(self, request, queryset):
        """
        Marca empréstimos ativos como atrasados
        """
        updated = queryset.filter(status='ativo').update(status='atrasado')
        self.message_user(
            request, 
            f'{updated} empréstimo(s) marcado(s) como atrasado(s).'
        )
    mark_as_overdue.short_description = "Marcar como atrasado"
    
    def mark_as_cancelled(self, request, queryset):
        """
        Cancela empréstimos ativos
        """
        active_loans = queryset.filter(status__in=['ativo', 'atrasado'])
        
        # Libera os equipamentos
        for loan in active_loans:
            loan.equipment.status = 'disponivel'
            loan.equipment.save()
        
        updated = active_loans.update(status='cancelado')
        
        self.message_user(
            request, 
            f'{updated} empréstimo(s) cancelado(s).'
        )
    mark_as_cancelled.short_description = "Cancelar empréstimo"
    
    def get_queryset(self, request):
        """
        Otimiza queries para o admin
        """
        return super().get_queryset(request).select_related('user', 'equipment', 'created_by')


@admin.register(LoanRequest)
class LoanRequestAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo LoanRequest
    """
    list_display = [
        'id', 'user', 'status', 'tecnico_responsavel',
        'aprovado_por', 'confirmado_pelo_tecnico', 'confirmado_pelo_utente',
        'confirmacao_completa', 'created_at'
    ]
    list_filter = [
        'status', 'confirmado_pelo_tecnico', 'confirmado_pelo_utente',
        'created_at', 'expected_return_date', 'devolucao_mesmo_dia'
    ]
    search_fields = [
        'user__name', 'user__email', 'purpose', 'notes', 'motivo_cancelamento'
    ]
    ordering = ['-created_at']
    readonly_fields = [
        'created_at', 'updated_at', 'user_name', 'tecnico_name', 'aprovador_name',
        'confirmacao_completa'
    ]

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('user', 'equipments', 'pacote', 'purpose')
        }),
        ('Datas', {
            'fields': ('expected_return_date', 'expected_return_time')
        }),
        ('Devolução', {
            'fields': ('devolucao_mesmo_dia', 'data_prevista_devolucao'),
        }),
        ('Status e Aprovação', {
            'fields': ('status', 'aprovado_por', 'motivo_decisao', 'data_decisao')
        }),
        ('Cancelamento', {
            'fields': ('cancelado_por', 'data_cancelamento', 'motivo_cancelamento'),
            'classes': ('collapse',)
        }),
        ('Confirmação Dupla', {
            'fields': (
                'tecnico_responsavel', 'confirmado_pelo_tecnico', 'data_levantamento',
                'confirmado_pelo_utente', 'data_confirmacao_utente',
                'confirmacao_completa'
            ),
        }),
        ('Observações', {
            'fields': ('notes',)
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at', 'user_name', 'tecnico_name', 'aprovador_name'),
            'classes': ('collapse',)
        }),
    )

    filter_horizontal = ['equipments']

    actions = ['aprovar_solicitacoes', 'rejeitar_solicitacoes', 'cancelar_solicitacoes']
    
    def aprovar_solicitacoes(self, request, queryset):
        """
        Aprova solicitações pendentes
        """
        pending = queryset.filter(status='pendente')
        updated = 0
        
        for loan_request in pending:
            loan_request.aprovar(request.user, 'Aprovado via admin')
            updated += 1
        
        self.message_user(
            request,
            f'{updated} solicitação(ões) aprovada(s).'
        )
    aprovar_solicitacoes.short_description = "Aprovar solicitações selecionadas"
    
    def rejeitar_solicitacoes(self, request, queryset):
        """
        Rejeita solicitações pendentes
        """
        pending = queryset.filter(status='pendente')
        updated = 0
        
        for loan_request in pending:
            loan_request.rejeitar(request.user, 'Rejeitado via admin')
            updated += 1
        
        self.message_user(
            request,
            f'{updated} solicitação(ões) rejeitada(s).',
            level='warning'
        )
    rejeitar_solicitacoes.short_description = "Rejeitar solicitações selecionadas"
    
    def cancelar_solicitacoes(self, request, queryset):
        """
        Cancela solicitações pendentes/autorizadas
        """
        cancellable = queryset.filter(status__in=['pendente', 'autorizado'])
        updated = 0

        for req in cancellable:
            req.cancelar(request.user, 'Cancelado via admin')
            updated += 1

        self.message_user(
            request,
            f'{updated} solicitação(ões) cancelada(s).',
            level='warning'
        )
    cancelar_solicitacoes.short_description = "Cancelar solicitações selecionadas"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'tecnico_responsavel', 'aprovado_por', 'cancelado_por'
        ).prefetch_related('equipments')
