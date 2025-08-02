from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Configuração do admin para o modelo User customizado
    """
    list_display = [
        'email', 'name', 'username', 'role', 'department', 
        'is_active', 'is_staff', 'created_at'
    ]
    list_filter = [
        'role', 'department', 'is_active', 'is_staff', 'is_superuser', 'created_at'
    ]
    search_fields = ['email', 'name', 'username']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('username', 'email', 'password')
        }),
        ('Informações Pessoais', {
            'fields': ('name', 'role', 'department')
        }),
        ('Permissões', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions'
            ),
        }),
        ('Datas Importantes', {
            'fields': ('last_login', 'date_joined', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'name', 'role', 'department', 'password1', 'password2'),
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """
        Define campos somente leitura baseado no usuário
        """
        readonly_fields = list(self.readonly_fields)
        
        # Usuários não superusuários não podem editar permissões
        if not request.user.is_superuser:
            readonly_fields.extend(['is_staff', 'is_superuser', 'groups', 'user_permissions'])
        
        return readonly_fields
