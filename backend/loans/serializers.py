from rest_framework import serializers
from django.utils import timezone
from .models import Loan, LoanRequest
from accounts.serializers import UserPublicSerializer
from equipment.serializers import EquipmentSummarySerializer


class LoanSerializer(serializers.ModelSerializer):
    """
    Serializer completo para o modelo Loan
    """
    user_name = serializers.ReadOnlyField()
    equipment_name = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()
    created_by_user_name = serializers.ReadOnlyField(source='created_by.name')
    tecnico_entrega_name = serializers.ReadOnlyField(source='tecnico_entrega.name')
    
    # Relacionamentos aninhados para leitura
    user_detail = UserPublicSerializer(source='user', read_only=True)
    equipment_detail = EquipmentSummarySerializer(source='equipment', read_only=True)
    
    class Meta:
        model = Loan
        fields = [
            'id', 'user', 'equipment', 'start_date', 'start_time', 'expected_return_date', 'expected_return_time',
            'actual_return_date', 'status', 'purpose', 'notes',
            'created_at', 'updated_at', 'created_by', 'created_by_user_name',
            'user_name', 'equipment_name', 'is_overdue', 'days_overdue',
            'user_detail', 'equipment_detail',
            'tecnico_entrega', 'tecnico_entrega_name', 'confirmado_levantamento', 'data_confirmacao_levantamento'
        ]
        extra_kwargs = {
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'created_by': {'read_only': True},
            'start_date': {'read_only': True},
            'start_time': {'read_only': True},
        }
    
    def validate(self, data):
        """
        Validações customizadas para empréstimo
        """
        equipment = data.get('equipment')
        start_date = timezone.now().date()  # Sempre usa a data atual
        expected_return_date = data.get('expected_return_date')
        
        # Verifica se o equipamento está disponível para empréstimo
        if equipment and not equipment.can_be_borrowed():
            raise serializers.ValidationError({
                'equipment': f'Equipamento não está disponível. Status atual: {equipment.get_status_display()}'
            })
        
        # Verifica se a data de devolução não é anterior à data de início (permite mesma data)
        if expected_return_date and start_date and expected_return_date < start_date:
            raise serializers.ValidationError({
                'expected_return_date': 'Data de devolução não pode ser anterior à data de início.'
            })
        
        return data
    
    def create(self, validated_data):
        """
        Cria um novo empréstimo
        """
        # Define o usuário que está criando o empréstimo
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class LoanListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de empréstimos
    """
    user_name = serializers.ReadOnlyField()
    equipment_name = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()
    
    class Meta:
        model = Loan
        fields = [
            'id', 'user_name', 'equipment_name', 'start_date', 'start_time',
            'expected_return_date', 'expected_return_time', 'status', 'is_overdue', 'days_overdue'
        ]


class LoanReturnSerializer(serializers.Serializer):
    """
    Serializer para devolução de equipamento
    """
    return_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    
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
        
        # Adiciona observações sobre a devolução
        if notes:
            existing_notes = loan.notes or ''
            loan.notes = f"{existing_notes}\n\nDevolução: {notes}".strip()
        
        loan.return_equipment(return_date)
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
    
    # Relacionamentos aninhados para leitura
    user_detail = UserPublicSerializer(source='user', read_only=True)
    equipments_detail = EquipmentSummarySerializer(source='equipments', many=True, read_only=True)
    
    class Meta:
        model = LoanRequest
        fields = [
            'id', 'user', 'equipments', 'quantity', 'purpose', 'expected_return_date', 'expected_return_time',
            'notes', 'status', 'aprovado_por', 'motivo_decisao', 'data_decisao',
            'tecnico_responsavel', 'data_levantamento', 'confirmado_pelo_tecnico',
            'created_at', 'updated_at',
            'user_name', 'tecnico_name', 'aprovador_name',
            'user_detail', 'equipments_detail'
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
        }
    
    def validate(self, data):
        """
        Validações customizadas para solicitação de empréstimo
        """
        quantity = data.get('quantity')
        expected_return_date = data.get('expected_return_date')
        
        # Verifica se a quantidade é maior que 5
        if quantity and quantity <= 5:
            raise serializers.ValidationError({
                'quantity': 'Solicitações de empréstimo são para quantidades superiores a 5 equipamentos. Para quantidades menores, faça o empréstimo direto.'
            })
        
        # Verifica se a data de devolução não é anterior à data atual
        if expected_return_date and expected_return_date < timezone.now().date():
            raise serializers.ValidationError({
                'expected_return_date': 'Data de devolução não pode ser anterior à data atual.'
            })
        
        return data
    
    def create(self, validated_data):
        """
        Cria uma nova solicitação de empréstimo
        """
        equipments_data = validated_data.pop('equipments', [])
        
        # Atribui o técnico responsável (quem está criando, se for técnico)
        if self.context['request'].user.role == 'tecnico':
            validated_data['tecnico_responsavel'] = self.context['request'].user
        
        loan_request = super().create(validated_data)
        
        # Adiciona os equipamentos
        if equipments_data:
            loan_request.equipments.set(equipments_data)
        
        return loan_request


class LoanRequestListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de solicitações
    """
    user_name = serializers.ReadOnlyField()
    tecnico_name = serializers.ReadOnlyField()
    aprovador_name = serializers.ReadOnlyField()
    
    class Meta:
        model = LoanRequest
        fields = [
            'id', 'user_name', 'quantity', 'purpose', 'expected_return_date',
            'status', 'tecnico_name', 'aprovador_name', 'confirmado_pelo_tecnico',
            'created_at'
        ]


class LoanRequestApprovalSerializer(serializers.Serializer):
    """
    Serializer para aprovação/rejeição de solicitações
    """
    motivo = serializers.CharField(required=False, allow_blank=True)
    
    def validate_motivo(self, value):
        # Se for rejeição, motivo é obrigatório
        if self.context.get('action') == 'rejeitar' and not value:
            raise serializers.ValidationError('Motivo da rejeição é obrigatório.')
        return value


class LoanRequestConfirmPickupSerializer(serializers.Serializer):
    """
    Serializer para confirmação de levantamento pelo técnico
    """
    notes = serializers.CharField(required=False, allow_blank=True)


class LoanConfirmPickupSerializer(serializers.Serializer):
    """
    Serializer para confirmação de levantamento de empréstimo normal
    """
    notes = serializers.CharField(required=False, allow_blank=True)
