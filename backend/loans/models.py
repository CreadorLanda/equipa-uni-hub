from django.db import models
from django.utils import timezone
from django.conf import settings


def get_current_date():
    """Retorna a data atual (sem hora) para usar como default"""
    return timezone.now().date()


def get_current_time():
    """Retorna a hora atual para usar como default"""
    return timezone.now().time()


class Loan(models.Model):
    """
    Modelo de empréstimo baseado no interface TypeScript Loan
    """
    LOAN_STATUS_CHOICES = [
        ('pendente', 'Pendente Levantamento'),  # Aguardando confirmação do técnico
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
    start_time = models.TimeField(
        default=get_current_time,
        verbose_name='Hora de Início'
    )
    expected_return_date = models.DateField(
        verbose_name='Data Prevista de Devolução'
    )
    expected_return_time = models.TimeField(
        blank=True,
        null=True,
        verbose_name='Hora Prevista de Devolução'
    )
    actual_return_date = models.DateField(
        blank=True,
        null=True,
        verbose_name='Data Real de Devolução'
    )
    status = models.CharField(
        max_length=20,
        choices=LOAN_STATUS_CHOICES,
        default='pendente',  # Alterado: empréstimo começa pendente até técnico confirmar
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
    
    # Campos para rastreamento do técnico que entregou o equipamento
    tecnico_entrega = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='loans_entregues',
        limit_choices_to={'role': 'tecnico'},
        verbose_name='Técnico que entregou'
    )
    confirmado_levantamento = models.BooleanField(
        default=False,
        verbose_name='Levantamento confirmado'
    )
    data_confirmacao_levantamento = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Data de confirmação do levantamento'
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
    
    def get_all_equipments(self):
        """
        Retorna todos os equipamentos deste empréstimo
        (equipamento principal + acessórios via LoanEquipment)
        """
        # Equipamento principal (campo direto)
        equipments = [{
            'id': self.equipment.id,
            'name': str(self.equipment),
            'is_primary': True,
            'returned': False
        }]
        
        # Acessórios adicionais (via LoanEquipment)
        for loan_eq in self.loan_equipments.all():
            equipments.append({
                'id': loan_eq.equipment.id,
                'name': str(loan_eq.equipment),
                'is_primary': loan_eq.is_primary,
                'returned': loan_eq.returned
            })
        
        return equipments
    
    def confirmar_levantamento(self, tecnico):
        """
        Técnico confirma que utente levantou o(s) equipamento(s)
        """
        self.confirmado_levantamento = True
        self.tecnico_entrega = tecnico
        self.data_confirmacao_levantamento = timezone.now()
        self.status = 'ativo'  # Muda de 'pendente' para 'ativo'
        self.save()
        
        # Atualiza status de todos os equipamentos para 'emprestado'
        self.equipment.status = 'emprestado'
        self.equipment.save()
        
        for loan_eq in self.loan_equipments.all():
            loan_eq.equipment.status = 'emprestado'
            loan_eq.equipment.save()
    
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
        # Atualiza automaticamente o status se estiver atrasado (apenas se já estiver ativo)
        if self.status == 'ativo' and self.is_overdue:
            self.status = 'atrasado'
        
        # REMOVIDO: Não muda status do equipamento automaticamente
        # Status só muda quando técnico confirmar levantamento via confirmar_levantamento()
        
        super().save(*args, **kwargs)


class LoanEquipment(models.Model):
    """
    Modelo intermediário para relacionar múltiplos equipamentos a um empréstimo
    Permite emprestar equipamento principal + acessórios juntos
    """
    loan = models.ForeignKey(
        'Loan',
        on_delete=models.CASCADE,
        related_name='loan_equipments',
        verbose_name='Empréstimo'
    )
    equipment = models.ForeignKey(
        'equipment.Equipment',
        on_delete=models.CASCADE,
        related_name='loan_items',
        verbose_name='Equipamento'
    )
    is_primary = models.BooleanField(
        default=False,
        verbose_name='É o equipamento principal'
    )
    returned = models.BooleanField(
        default=False,
        verbose_name='Devolvido'
    )
    return_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Data de devolução'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Observações'
    )
    
    class Meta:
        db_table = 'loan_equipments'
        verbose_name = 'Equipamento do Empréstimo'
        verbose_name_plural = 'Equipamentos dos Empréstimos'
        unique_together = ['loan', 'equipment']  # Evita duplicação
    
    def __str__(self):
        tipo = "Principal" if self.is_primary else "Acessório"
        return f"{tipo}: {self.equipment} (Empréstimo #{self.loan.id})"


class LoanRequest(models.Model):
    """
    Modelo de solicitação de empréstimo para grandes quantidades (>5 equipamentos)
    Requer aprovação da reitoria
    """
    REQUEST_STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('autorizado', 'Autorizado'),
        ('rejeitado', 'Rejeitado'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='loan_requests',
        verbose_name='Utente'
    )
    equipments = models.ManyToManyField(
        'equipment.Equipment',
        related_name='loan_requests',
        verbose_name='Equipamentos solicitados'
    )
    quantity = models.IntegerField(
        verbose_name='Quantidade de equipamentos'
    )
    purpose = models.TextField(
        verbose_name='Finalidade'
    )
    expected_return_date = models.DateField(
        verbose_name='Data Prevista de Devolução'
    )
    expected_return_time = models.TimeField(
        blank=True,
        null=True,
        verbose_name='Hora Prevista de Devolução'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Observações'
    )
    
    # Status da solicitação
    status = models.CharField(
        max_length=20,
        choices=REQUEST_STATUS_CHOICES,
        default='pendente',
        verbose_name='Status'
    )
    
    # Aprovação/Rejeição pela reitoria
    aprovado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='loan_requests_aprovados',
        limit_choices_to={'role': 'coordenador'},
        verbose_name='Aprovado/Rejeitado por'
    )
    motivo_decisao = models.TextField(
        blank=True,
        null=True,
        verbose_name='Motivo da aprovação/rejeição'
    )
    data_decisao = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Data da decisão'
    )
    
    # Técnico responsável pela solicitação
    tecnico_responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='loan_requests_recebidas',
        limit_choices_to={'role': 'tecnico'},
        verbose_name='Técnico responsável'
    )
    
    # Levantamento dos equipamentos
    data_levantamento = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Data de levantamento'
    )
    confirmado_pelo_tecnico = models.BooleanField(
        default=False,
        verbose_name='Levantamento confirmado pelo técnico'
    )
    
    # Campos de auditoria
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'loan_requests'
        verbose_name = 'Solicitação de Empréstimo'
        verbose_name_plural = 'Solicitações de Empréstimos'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Solicitação #{self.id} - {self.user.name} ({self.quantity} equipamentos)"
    
    @property
    def user_name(self):
        return self.user.name
    
    @property
    def tecnico_name(self):
        return self.tecnico_responsavel.name if self.tecnico_responsavel else None
    
    @property
    def aprovador_name(self):
        return self.aprovado_por.name if self.aprovado_por else None
    
    def aprovar(self, aprovador, motivo=''):
        """Aprova a solicitação"""
        self.status = 'autorizado'
        self.aprovado_por = aprovador
        self.motivo_decisao = motivo
        self.data_decisao = timezone.now()
        self.save()
    
    def rejeitar(self, rejeitador, motivo):
        """Rejeita a solicitação"""
        self.status = 'rejeitado'
        self.aprovado_por = rejeitador
        self.motivo_decisao = motivo
        self.data_decisao = timezone.now()
        self.save()
    
    def confirmar_levantamento(self, tecnico):
        """Confirma que o utente levantou os equipamentos"""
        self.confirmado_pelo_tecnico = True
        self.data_levantamento = timezone.now()
        self.tecnico_responsavel = tecnico
        self.save()
