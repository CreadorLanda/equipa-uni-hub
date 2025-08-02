from django.db import models
from django.utils import timezone
from django.conf import settings
from datetime import timedelta


class Reservation(models.Model):
    """
    Modelo de reserva baseado no interface TypeScript Reservation
    """
    RESERVATION_STATUS_CHOICES = [
        ('ativa', 'Ativa'),
        ('confirmada', 'Confirmada'),
        ('cancelada', 'Cancelada'),
        ('expirada', 'Expirada'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservations',
        verbose_name='Usuário'
    )
    equipment = models.ForeignKey(
        'equipment.Equipment',
        on_delete=models.CASCADE,
        related_name='reservations',
        verbose_name='Equipamento'
    )
    reservation_date = models.DateField(
        default=timezone.now,
        verbose_name='Data da Reserva'
    )
    expected_pickup_date = models.DateField(
        verbose_name='Data Prevista de Retirada'
    )
    status = models.CharField(
        max_length=20,
        choices=RESERVATION_STATUS_CHOICES,
        default='ativa',
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
        related_name='created_reservations',
        verbose_name='Criado por'
    )
    confirmed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Confirmada em'
    )
    
    class Meta:
        db_table = 'reservations'
        verbose_name = 'Reserva'
        verbose_name_plural = 'Reservas'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['equipment', 'expected_pickup_date'],
                condition=models.Q(status__in=['ativa', 'confirmada']),
                name='unique_equipment_reservation_per_date'
            )
        ]
        
    def __str__(self):
        return f"Reserva: {self.equipment} para {self.user.name} em {self.expected_pickup_date}"
    
    @property
    def user_name(self):
        return self.user.name
    
    @property
    def equipment_name(self):
        return str(self.equipment)
    
    @property
    def is_expired(self):
        """Verifica se a reserva está expirada"""
        if self.status in ['confirmada', 'cancelada', 'expirada']:
            return False
        # Reserva expira se passou 1 dia da data prevista de retirada
        expiry_date = self.expected_pickup_date + timedelta(days=1)
        return timezone.now().date() > expiry_date
    
    @property
    def days_until_pickup(self):
        """Calcula quantos dias restam para a retirada"""
        days_diff = (self.expected_pickup_date - timezone.now().date()).days
        return max(0, days_diff)
    
    def confirm(self):
        """Confirma a reserva"""
        self.status = 'confirmada'
        self.confirmed_at = timezone.now()
        self.save()
    
    def cancel(self):
        """Cancela a reserva"""
        self.status = 'cancelada'
        self.save()
        
        # Se o equipamento estava reservado apenas para esta reserva,
        # volta para disponível
        if self.equipment.status == 'reservado':
            active_reservations = Reservation.objects.filter(
                equipment=self.equipment,
                status__in=['ativa', 'confirmada']
            ).exclude(id=self.id)
            
            if not active_reservations.exists():
                self.equipment.status = 'disponivel'
                self.equipment.save()
    
    def convert_to_loan(self, expected_return_date, start_date=None):
        """Converte a reserva em empréstimo"""
        from loans.models import Loan
        
        if start_date is None:
            start_date = timezone.now().date()
        
        loan = Loan.objects.create(
            user=self.user,
            equipment=self.equipment,
            start_date=start_date,
            expected_return_date=expected_return_date,
            purpose=self.purpose,
            notes=f"Convertido da reserva {self.id}. {self.notes or ''}".strip(),
            created_by=self.created_by
        )
        
        # Confirma a reserva
        self.confirm()
        
        return loan
    
    def save(self, *args, **kwargs):
        # Atualiza automaticamente o status se estiver expirada
        if self.status == 'ativa' and self.is_expired:
            self.status = 'expirada'
        
        # Atualiza o status do equipamento quando a reserva é criada
        if not self.pk and self.status == 'ativa':
            if self.equipment.status == 'disponivel':
                self.equipment.status = 'reservado'
                self.equipment.save()
            
        super().save(*args, **kwargs)
