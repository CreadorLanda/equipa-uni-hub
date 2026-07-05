from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin (Chefe DTI)'),
        ('tecnico', 'Técnico'),
        ('docente', 'Docente'),
        ('secretario', 'Secretário'),
        ('coordenador', 'Coordenador'),
    ]

    ADMIN_ROLES = ['admin']
    TECHNICIAN_ROLES = ['admin', 'tecnico']
    UTENTE_ROLES = ['docente', 'secretario', 'coordenador']
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

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_tecnico_or_admin(self):
        return self.role in self.TECHNICIAN_ROLES

    @property
    def is_utente(self):
        return self.role in self.UTENTE_ROLES


class AtribuidorEventual(models.Model):
    FUNCAO_CHOICES = [
        ('formador', 'Formador'),
        ('palestrante', 'Palestrante'),
        ('monitor', 'Monitor'),
        ('mentor', 'Mentor'),
        ('outro', 'Outro'),
    ]
    SEXO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Feminino'),
        ('O', 'Outro'),
    ]

    id = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=255, verbose_name='Nome')
    morada = models.TextField(verbose_name='Morada')
    grau_academico = models.CharField(max_length=255, verbose_name='Grau Académico')
    entidade_empregadora = models.CharField(
        max_length=255, blank=True, null=True,
        verbose_name='Entidade Empregadora (opcional)'
    )
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES, verbose_name='Sexo')
    funcao = models.CharField(
        max_length=50, choices=FUNCAO_CHOICES, default='outro',
        verbose_name='Função'
    )
    funcao_outro = models.CharField(
        max_length=255, blank=True, null=True,
        verbose_name='Outra função (especifique)'
    )

    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='atribuidores_criados',
        verbose_name='Criado por (admin)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'atribuidores_eventuais'
        verbose_name = 'Atribuidor Eventual'
        verbose_name_plural = 'Atribuidores Eventuais'

    def __str__(self):
        return f"{self.nome} - {self.get_funcao_display()}"
