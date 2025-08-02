from django.contrib import admin
from .models import Equipment


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo Equipment
    """
    list_display = [
        'brand', 'model', 'type', 'status', 'serial_number', 
        'location', 'acquisition_date', 'created_at'
    ]
    list_filter = [
        'type', 'status', 'brand', 'acquisition_date', 'created_at'
    ]
    search_fields = [
        'brand', 'model', 'serial_number', 'description', 'location'
    ]
    ordering = ['brand', 'model']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('brand', 'model', 'type', 'serial_number')
        }),
        ('Status e Localização', {
            'fields': ('status', 'location')
        }),
        ('Detalhes', {
            'fields': ('description', 'acquisition_date')
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_available', 'mark_as_maintenance', 'mark_as_inactive']
    
    def mark_as_available(self, request, queryset):
        """
        Marca equipamentos selecionados como disponíveis
        """
        updated = queryset.update(status='disponivel')
        self.message_user(
            request, 
            f'{updated} equipamento(s) marcado(s) como disponível(is).'
        )
    mark_as_available.short_description = "Marcar como disponível"
    
    def mark_as_maintenance(self, request, queryset):
        """
        Marca equipamentos selecionados como em manutenção
        """
        # Só permite marcar como manutenção se não estiver emprestado
        valid_equipment = queryset.exclude(status='emprestado')
        updated = valid_equipment.update(status='manutencao')
        
        excluded_count = queryset.filter(status='emprestado').count()
        
        if excluded_count > 0:
            self.message_user(
                request, 
                f'{updated} equipamento(s) marcado(s) para manutenção. '
                f'{excluded_count} equipamento(s) emprestado(s) foram ignorados.',
                level='warning'
            )
        else:
            self.message_user(
                request, 
                f'{updated} equipamento(s) marcado(s) para manutenção.'
            )
    mark_as_maintenance.short_description = "Marcar para manutenção"
    
    def mark_as_inactive(self, request, queryset):
        """
        Marca equipamentos selecionados como inativos
        """
        # Só permite marcar como inativo se não estiver emprestado ou reservado
        valid_equipment = queryset.exclude(status__in=['emprestado', 'reservado'])
        updated = valid_equipment.update(status='inativo')
        
        excluded_count = queryset.filter(status__in=['emprestado', 'reservado']).count()
        
        if excluded_count > 0:
            self.message_user(
                request, 
                f'{updated} equipamento(s) marcado(s) como inativo(s). '
                f'{excluded_count} equipamento(s) em uso foram ignorados.',
                level='warning'
            )
        else:
            self.message_user(
                request, 
                f'{updated} equipamento(s) marcado(s) como inativo(s).'
            )
    mark_as_inactive.short_description = "Marcar como inativo"
