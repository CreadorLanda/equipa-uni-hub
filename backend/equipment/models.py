import hashlib, uuid
from django.db import models
from django.utils import timezone


class Equipment(models.Model):
    """
    Modelo de equipamento baseado no interface TypeScript Equipment
    """
    EQUIPMENT_TYPE_CHOICES = [
        ('notebook', 'Notebook'),
        ('desktop', 'Desktop'),
        ('tablet', 'Tablet'),
        ('projetor', 'Projetor'),
        ('impressora', 'Impressora'),
        ('monitor', 'Monitor'),
        ('acessorio', 'Acessório'),
        ('outros', 'Outros'),
    ]
    
    EQUIPMENT_STATUS_CHOICES = [
        ('disponivel', 'Disponível'),
        ('emprestado', 'Emprestado'),
        ('reservado', 'Reservado'),
        ('manutencao', 'Manutenção'),
        ('inativo', 'Inativo'),
    ]
    
    id = models.AutoField(primary_key=True)
    brand = models.CharField(max_length=100, verbose_name='Marca')
    model = models.CharField(max_length=100, verbose_name='Modelo')
    type = models.CharField(
        max_length=20,
        choices=EQUIPMENT_TYPE_CHOICES,
        verbose_name='Tipo'
    )
    status = models.CharField(
        max_length=20,
        choices=EQUIPMENT_STATUS_CHOICES,
        default='disponivel',
        verbose_name='Status'
    )
    serial_number = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='Número de Série'
    )
    acquisition_date = models.DateField(
        default=timezone.now,
        verbose_name='Data de Aquisição'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descrição'
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Localização'
    )
    color = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Cor'
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Categoria',
        help_text='Categoria adicional do equipamento (ex: Profissional, Educacional, etc.)'
    )
    
    qrcode_hash = models.CharField(
        max_length=64,
        unique=True,
        blank=True,
        null=True,
        verbose_name='Hash do QR Code'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'equipment'
        verbose_name = 'Equipamento'
        verbose_name_plural = 'Equipamentos'
        ordering = ['brand', 'model']
        
    def __str__(self):
        return f"{self.brand} {self.model} ({self.serial_number})"
    
    @property
    def full_name(self):
        return f"{self.brand} {self.model}"
    
    def is_available(self):
        return self.status == 'disponivel'
    
    def can_be_borrowed(self):
        return self.status == 'disponivel'
    
    @property
    def qrcode_url(self):
        if self.qrcode_hash:
            return f"/api/v1/equipment/qrcode/{self.qrcode_hash}/"
        return None
    
    def save(self, *args, **kwargs):
        if not self.qrcode_hash:
            raw = f"{self.serial_number}-{uuid.uuid4().hex[:8]}"
            self.qrcode_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]
        super().save(*args, **kwargs)
