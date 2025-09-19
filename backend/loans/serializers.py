from rest_framework import serializers
from django.utils import timezone
from .models import Loan
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
            'user_detail', 'equipment_detail'
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