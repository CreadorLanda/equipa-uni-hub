from rest_framework import serializers
from .models import Equipment


class EquipmentSerializer(serializers.ModelSerializer):
    """
    Serializer completo para o modelo Equipment
    """
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Equipment
        fields = [
            'id', 'brand', 'model', 'type', 'status', 'serial_number',
            'acquisition_date', 'description', 'location', 'full_name',
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }
    
    def validate_serial_number(self, value):
        """
        Valida se o número de série é único
        """
        instance = getattr(self, 'instance', None)
        if Equipment.objects.filter(serial_number=value).exclude(
            pk=instance.pk if instance else None
        ).exists():
            raise serializers.ValidationError(
                'Já existe um equipamento com este número de série.'
            )
        return value


class EquipmentListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de equipamentos
    """
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Equipment
        fields = [
            'id', 'brand', 'model', 'type', 'status', 'serial_number',
            'location', 'full_name'
        ]


class EquipmentSummarySerializer(serializers.ModelSerializer):
    """
    Serializer resumido para referências em outros modelos
    """
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Equipment
        fields = ['id', 'full_name', 'serial_number', 'status', 'type']


class EquipmentStatsSerializer(serializers.Serializer):
    """
    Serializer para estatísticas de equipamentos
    """
    total_equipments = serializers.IntegerField()
    available_equipments = serializers.IntegerField()
    loaned_equipments = serializers.IntegerField()
    reserved_equipments = serializers.IntegerField()
    maintenance_equipments = serializers.IntegerField()
    inactive_equipments = serializers.IntegerField()
    
    # Estatísticas por tipo
    equipment_by_type = serializers.DictField()
    
    # Estatísticas por status
    equipment_by_status = serializers.DictField() 