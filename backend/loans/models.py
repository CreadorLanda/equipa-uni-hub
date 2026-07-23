import hashlib, uuid
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
        ('pendente', 'Pendente'),  # Aguardando confirmações
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
        verbose_name='Equipamento',
        null=True, blank=True,
    )
    pacote = models.ForeignKey(
        'equipment.EquipmentPackage',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='loans',
        verbose_name='Pacote'
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
        default='pendente',
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
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_loans',
        verbose_name='Criado por'
    )
    
    # CONFIRMAÇÃO DUPLA
    confirmado_tecnico = models.BooleanField(
        default=False,
        verbose_name='Confirmado pelo técnico'
    )
    data_confirmacao_tecnico = models.DateTimeField(
        null=True, blank=True,
        verbose_name='Data de confirmação do técnico'
    )
    tecnico_entrega = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='loans_entregues',
        limit_choices_to={'role': 'tecnico'},
        verbose_name='Técnico que entregou'
    )
    confirmado_utente = models.BooleanField(
        default=False,
        verbose_name='Confirmado pelo utente'
    )
    data_confirmacao_utente = models.DateTimeField(
        null=True, blank=True,
        verbose_name='Data de confirmação do utente'
    )
    
    # Campos mantidos para retrocompatibilidade (agora como properties)
    # confirmado_levantamento e data_confirmacao_levantamento foram removidos
    
    # DEVOLUÇÃO NO MESMO DIA
    devolucao_mesmo_dia = models.BooleanField(
        default=False,
        verbose_name='Devolução no mesmo dia?'
    )
    data_prevista_devolucao = models.DateField(
        null=True, blank=True,
        verbose_name='Data prevista de devolução'
    )

    class Meta:
        db_table = 'loans'
        verbose_name = 'Empréstimo'
        verbose_name_plural = 'Empréstimos'
        ordering = ['-created_at']
    
    def __str__(self):
        if self.equipment:
            return f"Empréstimo: {self.equipment} para {self.user.name}"
        if self.pacote:
            return f"Empréstimo: {self.pacote} para {self.user.name}"
        return f"Empréstimo #{self.id} - {self.user.name}"
    
    @property
    def confirmado_levantamento(self):
        """Retrocompatibilidade: true se AMBAS confirmações existirem"""
        return self.confirmado_tecnico and self.confirmado_utente
    
    @property
    def data_confirmacao_levantamento(self):
        """Retrocompatibilidade: data da última confirmação"""
        if not (self.confirmado_tecnico and self.confirmado_utente):
            return None
        if self.data_confirmacao_tecnico and self.data_confirmacao_utente:
            return max(self.data_confirmacao_tecnico, self.data_confirmacao_utente)
        return self.data_confirmacao_tecnico or self.data_confirmacao_utente
    
    @property
    def user_name(self):
        return self.user.name
    
    @property
    def equipment_name(self):
        if self.equipment:
            return str(self.equipment)
        if self.pacote:
            return str(self.pacote)
        return '—'
    
    def get_all_equipments(self):
        equipments = []
        
        if self.equipment:
            equipments.append({
                'id': self.equipment.id,
                'name': str(self.equipment),
                'is_primary': True,
                'returned': False
            })
        
        if self.pacote:
            for item in self.pacote.items.all():
                equipments.append({
                    'id': item.equipment.id,
                    'name': str(item.equipment),
                    'is_primary': False,
                    'returned': False
                })
        
        for loan_eq in self.loan_equipments.all():
            equipments.append({
                'id': loan_eq.equipment.id,
                'name': str(loan_eq.equipment),
                'is_primary': loan_eq.is_primary,
                'returned': loan_eq.returned
            })
        
        return equipments
    
    def confirmar_tecnico(self, tecnico):
        """Técnico confirma que utente levantou o(s) equipamento(s)"""
        self.confirmado_tecnico = True
        self.tecnico_entrega = tecnico
        self.data_confirmacao_tecnico = timezone.now()
        
        if self.confirmado_utente:
            self._ativar_emprestimo()
        else:
            self.save()
    
    def confirmar_utente(self):
        """Utente confirma que levantou o(s) equipamento(s)"""
        self.confirmado_utente = True
        self.data_confirmacao_utente = timezone.now()
        
        if self.confirmado_tecnico:
            self._ativar_emprestimo()
        else:
            self.save()
    
    def _ativar_emprestimo(self):
        """Ativa o empréstimo quando ambas confirmações existirem"""
        self.status = 'ativo'
        self.save()
        
        if self.equipment:
            self.equipment.status = 'emprestado'
            self.equipment.save()
        
        if self.pacote:
            for item in self.pacote.items.all():
                item.equipment.status = 'emprestado'
                item.equipment.save()
        
        for loan_eq in self.loan_equipments.all():
            loan_eq.equipment.status = 'emprestado'
            loan_eq.equipment.save()
    
    @property
    def is_overdue(self):
        if self.status == 'concluido':
            return False
        return timezone.now().date() > self.expected_return_date
    
    @property
    def days_overdue(self):
        if not self.is_overdue:
            return 0
        return (timezone.now().date() - self.expected_return_date).days
    
    def return_equipment(self, return_date=None):
        if return_date is None:
            return_date = timezone.now().date()
        
        self.actual_return_date = return_date
        self.status = 'concluido'
        self.save()
        
        if self.equipment:
            self.equipment.status = 'disponivel'
            self.equipment.save()
        
        if self.pacote:
            for item in self.pacote.items.all():
                item.equipment.status = 'disponivel'
                item.equipment.save()
    
    def save(self, *args, **kwargs):
        if self.status == 'ativo' and self.is_overdue:
            self.status = 'atrasado'
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
    Modelo de solicitação de empréstimo (>5 equipamentos ou pacote único)
    Requer aprovação da reitoria e dupla confirmação (técnico + utente)
    """
    REQUEST_STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('autorizado', 'Autorizado'),
        ('rejeitado', 'Rejeitado'),
        ('cancelado', 'Cancelado'),
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
    pacote = models.ForeignKey(
        'equipment.EquipmentPackage',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='loan_requests',
        verbose_name='Pacote'
    )
    quantity = models.IntegerField(
        null=True, blank=True,
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
    
    # Cancelamento
    cancelado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='loan_requests_cancelados',
        verbose_name='Cancelado por'
    )
    data_cancelamento = models.DateTimeField(
        null=True, blank=True,
        verbose_name='Data de cancelamento'
    )
    motivo_cancelamento = models.TextField(
        blank=True, null=True,
        verbose_name='Motivo do cancelamento'
    )
    
    # Técnico responsável
    tecnico_responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='loan_requests_recebidas',
        limit_choices_to={'role': 'tecnico'},
        verbose_name='Técnico responsável'
    )
    
    # CONFIRMAÇÃO DUPLA
    confirmado_pelo_tecnico = models.BooleanField(
        default=False,
        verbose_name='Confirmado pelo técnico'
    )
    data_levantamento = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Data de levantamento'
    )
    confirmado_pelo_utente = models.BooleanField(
        default=False,
        verbose_name='Confirmado pelo utente'
    )
    data_confirmacao_utente = models.DateTimeField(
        null=True, blank=True,
        verbose_name='Data de confirmação do utente'
    )
    
    # DEVOLUÇÃO NO MESMO DIA
    devolucao_mesmo_dia = models.BooleanField(
        default=False,
        verbose_name='Devolução no mesmo dia?'
    )
    data_prevista_devolucao = models.DateField(
        null=True, blank=True,
        verbose_name='Data prevista de devolução'
    )
    
    # QR Code
    qrcode_hash = models.CharField(
        max_length=64, unique=True, blank=True, null=True,
        verbose_name='Hash do QR Code'
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
        if self.pacote:
            return f"Solicitação #{self.id} - {self.user.name} (Pacote: {self.pacote.name})"
        count = self.equipments.count()
        return f"Solicitação #{self.id} - {self.user.name} ({count} equipamentos)"
    
    @property
    def user_name(self):
        return self.user.name
    
    @property
    def tecnico_name(self):
        return self.tecnico_responsavel.name if self.tecnico_responsavel else None
    
    @property
    def aprovador_name(self):
        return self.aprovado_por.name if self.aprovado_por else None
    
    @property
    def confirmador_name(self):
        return self.cancelado_por.name if self.cancelado_por else None
    
    @property
    def is_special(self):
        """Solicitação especial = baseada em quantidade (precisa aprovação)"""
        return bool(self.quantity)
    
    @property
    def confirmacao_completa(self):
        return self.confirmado_pelo_tecnico and self.confirmado_pelo_utente
    
    def save(self, *args, **kwargs):
        if not self.qrcode_hash:
            raw = f"LR{self.id or ''}-{uuid.uuid4().hex[:8]}"
            self.qrcode_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]
        super().save(*args, **kwargs)

    def aprovar(self, aprovador, motivo=''):
        self.status = 'autorizado'
        self.aprovado_por = aprovador
        self.motivo_decisao = motivo
        self.data_decisao = timezone.now()
        self.save()
    
    def rejeitar(self, rejeitador, motivo):
        self.status = 'rejeitado'
        self.aprovado_por = rejeitador
        self.motivo_decisao = motivo
        self.data_decisao = timezone.now()
        self.save()
    
    def cancelar(self, cancelador, motivo=''):
        """Cancela a solicitação (apenas se pendente/autorizado)"""
        if self.status not in ['pendente', 'autorizado']:
            raise ValueError("Apenas solicitações pendentes ou autorizadas podem ser canceladas.")
        self.status = 'cancelado'
        self.cancelado_por = cancelador
        self.data_cancelamento = timezone.now()
        self.motivo_cancelamento = motivo
        self.save()
    
    def confirmar_levantamento_tecnico(self, tecnico):
        """Técnico confirma o levantamento"""
        self.confirmado_pelo_tecnico = True
        self.data_levantamento = timezone.now()
        self.tecnico_responsavel = tecnico
        self.save()
        return self.confirmacao_completa
    
    def confirmar_levantamento_utente(self):
        """Utente confirma o levantamento"""
        self.confirmado_pelo_utente = True
        self.data_confirmacao_utente = timezone.now()
        self.save()
        return self.confirmacao_completa
