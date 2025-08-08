from django.db import models
from django.utils import timezone
from django.conf import settings


def get_current_date():
    """Retorna a data atual (sem hora) para usar como default"""
    return timezone.now().date()


class Loan(models.Model):
    """
    Modelo de empréstimo baseado no interface TypeScript Loan
    """
    LOAN_STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('atrasado', 'Atrasado'),
        ('concluido', 'Concluído'),
        ('cancelado', 'Cancelado'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='loans',
        verbose_name='Usuário'
    )
    equipment = models.ForeignKey(
        'equipment.Equipment',
        on_delete=models.CASCADE,
        related_name='loans',
        verbose_name='Equipamento'
    )
    start_date = models.DateField(
        default=get_current_date,
        verbose_name='Data de Início'
    )
    expected_return_date = models.DateField(
        verbose_name='Data Prevista de Devolução'
    )
    actual_return_date = models.DateField(
        blank=True,
        null=True,
        verbose_name='Data Real de Devolução'
    )
    status = models.CharField(
        max_length=20,
        choices=LOAN_STATUS_CHOICES,
        default='ativo',
        verbose_name='Status'
    )
    purpose = models.TextField(
        verbose_name='Finalidade'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Observações'
    )
    
    # Campos adicionais úteis
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_loans',
        verbose_name='Criado por'
    )
    
    class Meta:
        db_table = 'loans'
        verbose_name = 'Empréstimo'
        verbose_name_plural = 'Empréstimos'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Empréstimo: {self.equipment} para {self.user.name}"
    
    @property
    def user_name(self):
        return self.user.name
    
    @property
    def equipment_name(self):
        return str(self.equipment)
    
    @property
    def is_overdue(self):
        """Verifica se o empréstimo está atrasado"""
        if self.status == 'concluido':
            return False
        return timezone.now().date() > self.expected_return_date
    
    @property
    def days_overdue(self):
        """Calcula quantos dias está atrasado"""
        if not self.is_overdue:
            return 0
        return (timezone.now().date() - self.expected_return_date).days
    
    def return_equipment(self, return_date=None):
        """Marca o equipamento como devolvido"""
        if return_date is None:
            return_date = timezone.now().date()
        
        self.actual_return_date = return_date
        self.status = 'concluido'
        self.save()
        
        # Atualiza o status do equipamento para disponível
        self.equipment.status = 'disponivel'
        self.equipment.save()
    
    def save(self, *args, **kwargs):
        # Atualiza automaticamente o status se estiver atrasado
        if self.status == 'ativo' and self.is_overdue:
            self.status = 'atrasado'
        
        # Atualiza o status do equipamento quando o empréstimo é criado
        if not self.pk and self.status == 'ativo':
            self.equipment.status = 'emprestado'
            self.equipment.save()
            
        super().save(*args, **kwargs)
