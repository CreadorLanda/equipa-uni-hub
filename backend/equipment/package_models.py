from django.db import models
from django.utils import timezone
from accounts.models import User
from equipment.models import Equipment


class EquipmentPackage(models.Model):
    """
    Modelo para pacotes personalizados de equipamentos
    Permite criar conjuntos pré-definidos de equipamentos para empréstimo
    """
    name = models.CharField(
        max_length=200,
        verbose_name='Nome do Pacote'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descrição'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_packages',
        verbose_name='Criado por'
    )
    is_template = models.BooleanField(
        default=True,
        verbose_name='É Template',
        help_text='Se verdadeiro, este pacote pode ser usado como base para novos pacotes'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'equipment_packages'
        verbose_name = 'Pacote de Equipamentos'
        verbose_name_plural = 'Pacotes de Equipamentos'
        ordering = ['-created_at']
        
    def __str__(self):
        return self.name
    
    @property
    def total_items(self):
        """Retorna o número total de itens no pacote"""
        return self.items.count()
    
    @property
    def is_available(self):
        """Verifica se todos os equipamentos do pacote estão disponíveis"""
        for item in self.items.all():
            if not item.equipment.is_available():
                return False
        return True


class PackageItem(models.Model):
    """
    Modelo para itens individuais dentro de um pacote
    Relação Many-to-Many entre Package e Equipment
    """
    package = models.ForeignKey(
        EquipmentPackage,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Pacote'
    )
    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name='package_items',
        verbose_name='Equipamento'
    )
    quantity = models.IntegerField(
        default=1,
        verbose_name='Quantidade'
    )
    is_optional = models.BooleanField(
        default=False,
        verbose_name='Opcional',
        help_text='Se verdadeiro, este item pode ser removido do pacote'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'package_items'
        verbose_name = 'Item do Pacote'
        verbose_name_plural = 'Itens do Pacote'
        unique_together = ['package', 'equipment']
        
    def __str__(self):
        return f"{self.package.name} - {self.equipment.full_name} (x{self.quantity})"
