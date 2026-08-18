from rest_framework import serializers
from django.utils import timezone
from .models import Loan, LoanRequest
from accounts.serializers import UserPublicSerializer
from equipment.models import Equipment
from equipment.serializers import EquipmentSummarySerializer, PackageSummarySerializer


class LoanSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField()
    equipment_name = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()
    created_by_user_name = serializers.ReadOnlyField(source='created_by.name')
    tecnico_entrega_name = serializers.ReadOnlyField(source='tecnico_entrega.name')
    confirmado_levantamento = serializers.ReadOnlyField()
    data_confirmacao_levantamento = serializers.ReadOnlyField()
    
    user_detail = UserPublicSerializer(source='user', read_only=True)
    equipment_detail = EquipmentSummarySerializer(source='equipment', read_only=True)
    pacote_detail = PackageSummarySerializer(source='pacote', read_only=True)

    # RF25
    estado_devolucao_display = serializers.CharField(
        source='get_estado_devolucao_display', read_only=True
    )
    recebido_por_name = serializers.ReadOnlyField(source='recebido_por.name')
    documento_devolucao_url = serializers.SerializerMethodField()

    def get_documento_devolucao_url(self, obj):
        if not obj.documento_devolucao:
            return None
        request = self.context.get('request')
        url = obj.documento_devolucao.url
        return request.build_absolute_uri(url) if request else url
    
    class Meta:
        model = Loan
        fields = [
            'id', 'user', 'equipment', 'pacote', 'start_date', 'start_time',
            'expected_return_date', 'expected_return_time',
            'actual_return_date', 'status', 'purpose', 'notes',
            'created_at', 'updated_at', 'created_by', 'created_by_user_name',
            'user_name', 'equipment_name', 'is_overdue', 'days_overdue',
            'user_detail', 'equipment_detail', 'pacote_detail',
            'tecnico_entrega', 'tecnico_entrega_name',
            'confirmado_tecnico', 'data_confirmacao_tecnico',
            'confirmado_utente', 'data_confirmacao_utente',
            'confirmado_levantamento', 'data_confirmacao_levantamento',
            'devolucao_mesmo_dia', 'data_prevista_devolucao',
            # RF25 - estado fisico registado na devolucao
            'estado_devolucao', 'estado_devolucao_display', 'observacoes_devolucao',
            'documento_devolucao_url', 'recebido_por_name',
        ]
        extra_kwargs = {
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'created_by': {'read_only': True},
            'start_date': {'read_only': True},
            'start_time': {'read_only': True},
        }
    
    def validate(self, data):
        equipment = data.get('equipment')
        pacote = data.get('pacote')
        expected_return_date = data.get('expected_return_date')
        start_date = timezone.now().date()
        
        if not equipment and not pacote:
            raise serializers.ValidationError(
                'Selecione um equipamento OU um pacote.'
            )
        
        if equipment and pacote:
            raise serializers.ValidationError(
                'Selecione apenas um equipamento OU um pacote, não ambos.'
            )
        
        if equipment and not equipment.can_be_borrowed():
            raise serializers.ValidationError({
                'equipment': f'Equipamento não está disponível. Status atual: {equipment.get_status_display()}'
            })
        
        if pacote and not pacote.is_available:
            raise serializers.ValidationError({
                'pacote': 'Pacote não está disponível (contém equipamentos indisponíveis).'
            })
        
        if expected_return_date and start_date and expected_return_date < start_date:
            raise serializers.ValidationError({
                'expected_return_date': 'Data de devolução não pode ser anterior à data de início.'
            })
        
        return data
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class LoanListSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField()
    equipment_name = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()
    confirmado_levantamento = serializers.ReadOnlyField()
    
    class Meta:
        model = Loan
        fields = [
            'id', 'user_name', 'equipment_name', 'start_date', 'start_time',
            'expected_return_date', 'expected_return_time', 'status', 'is_overdue', 'days_overdue',
            'confirmado_levantamento', 'confirmado_tecnico', 'confirmado_utente',
            'devolucao_mesmo_dia', 'data_prevista_devolucao',
            # necessarios aos relatorios de atrasos (RF34) e devolucoes (RF35)
            'actual_return_date', 'estado_devolucao', 'purpose',
        ]


class LoanReturnSerializer(serializers.Serializer):
    """
    Serializer para devolução de equipamento.
    RF25 - regista o estado físico verificado pelo técnico e aceita
    imagem ou relatório complementar (RN05).
    """
    return_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    estado_devolucao = serializers.ChoiceField(
        choices=Loan.ESTADO_DEVOLUCAO_CHOICES,
        required=False,
        default='disponivel',
    )
    documento = serializers.FileField(required=False, allow_null=True)

    def validate_documento(self, value):
        return validar_documento(value)
    
    def validate_return_date(self, value):
        """
        Valida a data de devolução
        """
        if not value:
            value = timezone.now().date()
        
        # Não pode ser anterior à data de início do empréstimo
        loan = self.context['loan']
        if value < loan.start_date:
            raise serializers.ValidationError(
                'Data de devolução não pode ser anterior à data de início do empréstimo.'
            )
        
        return value
    
    def save(self):
        """
        Processa a devolução do equipamento
        """
        loan = self.context['loan']
        return_date = self.validated_data.get('return_date', timezone.now().date())
        notes = self.validated_data.get('notes', '')
        estado = self.validated_data.get('estado_devolucao', 'disponivel')
        documento = self.validated_data.get('documento')

        # Adiciona observações sobre a devolução
        if notes:
            existing_notes = loan.notes or ''
            loan.notes = f"{existing_notes}\n\nDevolução: {notes}".strip()
            loan.observacoes_devolucao = notes

        if documento:
            loan.documento_devolucao = documento

        loan.return_equipment(
            return_date,
            estado=estado,
            recebido_por=self.context.get('recebido_por'),
        )
        return loan


class LoanStatsSerializer(serializers.Serializer):
    """
    Serializer para estatísticas de empréstimos
    """
    total_loans = serializers.IntegerField()
    active_loans = serializers.IntegerField()
    overdue_loans = serializers.IntegerField()
    completed_loans = serializers.IntegerField()
    cancelled_loans = serializers.IntegerField()
    
    # Estatísticas por período
    loans_this_month = serializers.IntegerField()
    loans_this_week = serializers.IntegerField()
    
    # Top usuários
    top_borrowers = serializers.ListField()
    
    # Top equipamentos
    most_borrowed_equipment = serializers.ListField()


class LoanRequestSerializer(serializers.ModelSerializer):
    """
    Serializer completo para o modelo LoanRequest
    """
    user_name = serializers.ReadOnlyField()
    tecnico_name = serializers.ReadOnlyField()
    aprovador_name = serializers.ReadOnlyField()
    cancelador_name = serializers.ReadOnlyField(source='cancelado_por.name')
    confirmacao_completa = serializers.ReadOnlyField()
    
    user_detail = UserPublicSerializer(source='user', read_only=True)
    equipments = serializers.PrimaryKeyRelatedField(
        many=True, read_only=False, queryset=Equipment.objects.all(),
        required=False, allow_empty=True
    )
    equipments_detail = EquipmentSummarySerializer(source='equipments', many=True, read_only=True)
    pacote_detail = PackageSummarySerializer(source='pacote', read_only=True)

    # RF30 - estado da atribuicao de equipamentos
    equipamentos_atribuidos = serializers.ReadOnlyField()
    equipamentos_em_falta = serializers.ReadOnlyField()
    atribuicao_completa = serializers.ReadOnlyField()
    is_special = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # RF24 - comprovativo digital arquivado
    comprovativo_url = serializers.SerializerMethodField()

    def get_comprovativo_url(self, obj):
        if not obj.comprovativo_levantamento:
            return None
        request = self.context.get('request')
        url = obj.comprovativo_levantamento.url
        return request.build_absolute_uri(url) if request else url

    # RF17 - documento validado pela Reitoria
    tem_documento = serializers.ReadOnlyField()
    documento_url = serializers.SerializerMethodField()
    documento_anexado_por_name = serializers.ReadOnlyField(source='documento_anexado_por.name')

    def get_documento_url(self, obj):
        if not obj.documento_validado:
            return None
        request = self.context.get('request')
        url = obj.documento_validado.url
        return request.build_absolute_uri(url) if request else url
    
    class Meta:
        model = LoanRequest
        fields = [
            'id', 'user', 'equipments', 'pacote', 'quantity', 'purpose',
            'expected_return_date', 'expected_return_time',
            'notes', 'status',
            'aprovado_por', 'motivo_decisao', 'data_decisao',
            'cancelado_por', 'data_cancelamento', 'motivo_cancelamento',
            'tecnico_responsavel',
            'data_levantamento', 'confirmado_pelo_tecnico',
            'confirmado_pelo_utente', 'data_confirmacao_utente',
            'confirmacao_completa',
            'qrcode_hash',
            'devolucao_mesmo_dia', 'data_prevista_devolucao',
            'created_at', 'updated_at',
            'user_name', 'tecnico_name', 'aprovador_name', 'cancelador_name',
            'user_detail', 'equipments_detail', 'pacote_detail',
            'documento_nome', 'documento_anexado_em', 'documento_anexado_por_name',
            'documento_url', 'tem_documento',
            'equipamentos_atribuidos', 'equipamentos_em_falta', 'atribuicao_completa',
            'is_special', 'status_display', 'comprovativo_url',
        ]
        extra_kwargs = {
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'status': {'read_only': True},
            'aprovado_por': {'read_only': True},
            'motivo_decisao': {'read_only': True},
            'data_decisao': {'read_only': True},
            'data_levantamento': {'read_only': True},
            'confirmado_pelo_tecnico': {'read_only': True},
            'confirmado_pelo_utente': {'read_only': True},
            'cancelado_por': {'read_only': True},
            'data_cancelamento': {'read_only': True},
            'documento_nome': {'read_only': True},
            'documento_anexado_em': {'read_only': True},
        }
    
    def validate(self, data):
        equipment_list = data.get('equipments', [])
        pacote = data.get('pacote')
        quantity = data.get('quantity', 0)
        expected_return_date = data.get('expected_return_date')

        is_by_quantity = quantity and quantity > 0

        if is_by_quantity:
            data['equipments'] = []
            data['pacote'] = None
        else:
            if not equipment_list and not pacote:
                raise serializers.ValidationError(
                    'Selecione um equipamento ou um pacote.'
                )
            if equipment_list and pacote:
                raise serializers.ValidationError(
                    'Selecione apenas equipamentos OU um pacote, não ambos.'
                )

        if expected_return_date and expected_return_date < timezone.now().date():
            raise serializers.ValidationError({
                'expected_return_date': 'Data de devolução não pode ser anterior à data atual.'
            })

        return data

    def create(self, validated_data):
        equipments_data = validated_data.pop('equipments', [])

        if self.context['request'].user.role == 'tecnico':
            validated_data['tecnico_responsavel'] = self.context['request'].user

        loan_request = super().create(validated_data)

        if equipments_data and not validated_data.get('quantity', 0):
            loan_request.equipments.set(equipments_data)

        return loan_request


class LoanRequestListSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField()
    tecnico_name = serializers.ReadOnlyField()
    aprovador_name = serializers.ReadOnlyField()
    confirmacao_completa = serializers.ReadOnlyField()
    tem_documento = serializers.ReadOnlyField()
    is_special = serializers.ReadOnlyField()
    equipamentos_atribuidos = serializers.ReadOnlyField()
    equipamentos_em_falta = serializers.ReadOnlyField()
    atribuicao_completa = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    documento_url = serializers.SerializerMethodField()

    def get_documento_url(self, obj):
        if not obj.documento_validado:
            return None
        request = self.context.get('request')
        url = obj.documento_validado.url
        return request.build_absolute_uri(url) if request else url
    
    class Meta:
        model = LoanRequest
        fields = [
            'id', 'user_name', 'purpose', 'expected_return_date',
            'status', 'tecnico_name', 'aprovador_name',
            'confirmado_pelo_tecnico', 'confirmado_pelo_utente', 'confirmacao_completa',
            'qrcode_hash', 'devolucao_mesmo_dia', 'created_at',
            'motivo_decisao',
            # quantity/is_special sao precisos no frontend para saber se a
            # solicitacao e especial e exigir o documento da Reitoria (RF17)
            'quantity', 'is_special',
            'tem_documento', 'documento_url', 'documento_nome',
            'equipamentos_atribuidos', 'equipamentos_em_falta', 'atribuicao_completa',
            'status_display',
        ]


# RF17 - limites do documento validado anexado a decisao
DOCUMENTO_EXTENSOES_ACEITES = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
DOCUMENTO_TAMANHO_MAXIMO = 10 * 1024 * 1024  # 10 MB


def validar_documento(ficheiro):
    """Valida extensao e tamanho do documento anexado (RF17)."""
    import os
    extensao = os.path.splitext(ficheiro.name)[1].lower()
    if extensao not in DOCUMENTO_EXTENSOES_ACEITES:
        raise serializers.ValidationError(
            'Formato não aceite. Use PDF, Word ou imagem (%s).'
            % ', '.join(DOCUMENTO_EXTENSOES_ACEITES)
        )
    if ficheiro.size > DOCUMENTO_TAMANHO_MAXIMO:
        raise serializers.ValidationError('O documento não pode exceder 10 MB.')
    return ficheiro


class LoanRequestApprovalSerializer(serializers.Serializer):
    """
    Serializer para aprovação/rejeição de solicitações.
    Aceita o documento validado pela Reitoria (RF17), obrigatório nas
    solicitações especiais (baseadas em quantidade).
    """
    motivo = serializers.CharField(required=False, allow_blank=True)
    documento = serializers.FileField(required=False, allow_null=True)
    
    def validate_motivo(self, value):
        # Se for rejeição, motivo é obrigatório
        if self.context.get('action') == 'rejeitar' and not value:
            raise serializers.ValidationError('Motivo da rejeição é obrigatório.')
        return value

    def validate_documento(self, value):
        return validar_documento(value)


class LoanRequestDocumentSerializer(serializers.Serializer):
    """
    Serializer para anexar o documento validado antes da decisão (RF17).
    """
    documento = serializers.FileField()

    def validate_documento(self, value):
        return validar_documento(value)


class LoanRequestAssignSerializer(serializers.Serializer):
    """
    RF30 - Atribuição manual de equipamentos a uma solicitação autorizada.
    """
    equipment_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )


class LoanRequestAssignQRSerializer(serializers.Serializer):
    """
    RF30 (fluxo alternativo) - Atribuição por leitura de QR Code.
    `confirmar_disponibilidade` cobre a RN05: o técnico tem o equipamento
    em mãos e confirma que está disponível, mesmo que o sistema o tenha
    marcado como indisponível.
    """
    qrcode_hash = serializers.CharField()
    confirmar_disponibilidade = serializers.BooleanField(required=False, default=False)


class LoanRequestConfirmPickupSerializer(serializers.Serializer):
    """
    Serializer para confirmação de levantamento pelo técnico
    """
    notes = serializers.CharField(required=False, allow_blank=True)


class LoanRequestCancelSerializer(serializers.Serializer):
    """
    Serializer para cancelamento de solicitação
    """
    motivo = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        if self.context.get('action') == 'cancelar_com_motivo' and not data.get('motivo'):
            raise serializers.ValidationError('Motivo do cancelamento é obrigatório para esta operação.')
        return data


class LoanConfirmPickupSerializer(serializers.Serializer):
    """
    Serializer para confirmação de levantamento (retrocompatibilidade)
    """
    notes = serializers.CharField(required=False, allow_blank=True)


class LoanConfirmTecnicoSerializer(serializers.Serializer):
    """
    Serializer para confirmação do técnico
    """
    notes = serializers.CharField(required=False, allow_blank=True)


class LoanConfirmUtenteSerializer(serializers.Serializer):
    """
    Serializer para confirmação do utente
    """
    notes = serializers.CharField(required=False, allow_blank=True)


class LoanCancelSerializer(serializers.Serializer):
    """
    Serializer para cancelamento
    """
    motivo = serializers.CharField(required=False, allow_blank=True)
