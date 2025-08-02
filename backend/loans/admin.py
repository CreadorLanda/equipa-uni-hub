from django.contrib import admin
from django.utils import timezone
from .models import Loan


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo Loan
    """
    list_display = [
        'equipment', 'user', 'start_date', 'expected_return_date',
        'actual_return_date', 'status', 'is_overdue', 'created_at'
    ]
    list_filter = [
        'status', 'start_date', 'expected_return_date', 'equipment__type',
        'user__role', 'created_at'
    ]
    search_fields = [
        'user__name', 'user__email', 'equipment__brand', 
        'equipment__model', 'equipment__serial_number', 'purpose'
    ]
    ordering = ['-created_at']
    readonly_fields = [
        'created_at', 'updated_at', 'is_overdue', 'days_overdue',
        'user_name', 'equipment_name'
    ]
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('user', 'equipment', 'purpose')
        }),
        ('Datas', {
            'fields': ('start_date', 'expected_return_date', 'actual_return_date')
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
