from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


class User(AbstractUser):
    """
    Modelo de usuário customizado
    """
    ROLE_CHOICES = [
        ('tecnico', 'Técnico'),
        ('docente', 'Docente'),
        ('secretario', 'Secretário'),
        ('coordenador', 'Coordenador'),
    ]
    
    EXTERNAL_ROLES = ['docente', 'secretario', 'coordenador']
    
    id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, verbose_name='Nome')
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='tecnico',
        verbose_name='Função'
    )
    department = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        verbose_name='Departamento'
    )
    
    # Integração com sistema externo de pessoas
    external_id = models.CharField(
        max_length=100,
        blank=True, null=True,
        verbose_name='ID no sistema externo'
    )
    is_external = models.BooleanField(
        default=False,
        verbose_name='Utilizador do sistema externo'
    )
    created_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_users',
        verbose_name='Criado por (admin)'
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        
    def __str__(self):
        return f"{self.name} ({self.email})"
    
    def get_full_name(self):
        return self.name
    
    def get_short_name(self):
        return self.name.split(' ')[0] if self.name else self.username
