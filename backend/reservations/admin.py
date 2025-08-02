from django.contrib import admin
from django.utils import timezone
from .models import Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo Reservation
    """
    list_display = [
        'equipment', 'user', 'reservation_date', 'expected_pickup_date',
        'status', 'is_expired', 'days_until_pickup', 'created_at'
    ]
    list_filter = [
        'status', 'reservation_date', 'expected_pickup_date', 
        'equipment__type', 'user__role', 'created_at'
    ]
    search_fields = [
        'user__name', 'user__email', 'equipment__brand', 
        'equipment__model', 'equipment__serial_number', 'purpose'
    ]
    ordering = ['-created_at']
    readonly_fields = [
        'created_at', 'updated_at', 'confirmed_at', 'is_expired',
        'days_until_pickup', 'user_name', 'equipment_name'
    ]
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('user', 'equipment', 'purpose')
        }),
        ('Datas', {
            'fields': ('reservation_date', 'expected_pickup_date')
        }),
        ('Status e Observações', {
            'fields': ('status', 'notes')
        }),
        ('Metadados', {
            'fields': (
                'created_by', 'created_at', 'updated_at', 'confirmed_at',
                'is_expired', 'days_until_pickup', 'user_name', 'equipment_name'
            ),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['confirm_reservations', 'cancel_reservations', 'mark_as_expired']
    
    def confirm_reservations(self, request, queryset):
        """
        Confirma reservas ativas
        """
        active_reservations = queryset.filter(status='ativa')
        
        for reservation in active_reservations:
            reservation.confirm()
        
        updated = active_reservations.count()
        
        self.message_user(
            request, 
            f'{updated} reserva(s) confirmada(s).'
        )
    confirm_reservations.short_description = "Confirmar reservas"
    
    def cancel_reservations(self, request, queryset):
        """
        Cancela reservas ativas ou confirmadas
        """
        active_reservations = queryset.filter(status__in=['ativa', 'confirmada'])
        
        for reservation in active_reservations:
            reservation.cancel()
        
        updated = active_reservations.count()
        
        self.message_user(
            request, 
            f'{updated} reserva(s) cancelada(s).'
        )
    cancel_reservations.short_description = "Cancelar reservas"
    
    def mark_as_expired(self, request, queryset):
        """
        Marca reservas como expiradas
        """
        # Apenas reservas ativas podem ser marcadas como expiradas
        active_reservations = queryset.filter(status='ativa')
        
        # Atualiza o status e libera equipamentos se necessário
        for reservation in active_reservations:
            reservation.status = 'expirada'
            reservation.save()
            
            # Se o equipamento estava reservado apenas para esta reserva,
            # marca como disponível
            if reservation.equipment.status == 'reservado':
                other_reservations = Reservation.objects.filter(
                    equipment=reservation.equipment,
                    status__in=['ativa', 'confirmada']
                ).exclude(id=reservation.id)
                
                if not other_reservations.exists():
                    reservation.equipment.status = 'disponivel'
                    reservation.equipment.save()
        
        updated = active_reservations.count()
        
        self.message_user(
            request, 
            f'{updated} reserva(s) marcada(s) como expirada(s).'
        )
    mark_as_expired.short_description = "Marcar como expirada"
    
    def get_queryset(self, request):
        """
        Otimiza queries para o admin
        """
        return super().get_queryset(request).select_related('user', 'equipment', 'created_by')
