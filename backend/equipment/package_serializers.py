from rest_framework import serializers
from .package_models import EquipmentPackage, PackageItem
from .serializers import EquipmentSummarySerializer


class PackageItemSerializer(serializers.ModelSerializer):
    """
    Serializer para itens do pacote
    """
    equipment = EquipmentSummarySerializer(read_only=True)
    equipment_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = PackageItem
        fields = [
            'id', 'equipment', 'equipment_id', 'quantity', 
            'is_optional', 'created_at'
        ]
        extra_kwargs = {
            'created_at': {'read_only': True},
        }


class EquipmentPackageSerializer(serializers.ModelSerializer):
    """
    Serializer completo para pacotes de equipamentos
    """
    items = PackageItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    total_items = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()
    
    class Meta:
        model = EquipmentPackage
        fields = [
            'id', 'name', 'description', 'created_by', 'created_by_name',
            'is_template', 'is_active', 'items', 'total_items', 'is_available',
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'created_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }


class EquipmentPackageListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de pacotes
    """
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    total_items = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()
    
    class Meta:
        model = EquipmentPackage
        fields = [
            'id', 'name', 'description', 'created_by_name',
            'is_template', 'is_active', 'total_items', 'is_available'
        ]


class CreatePackageSerializer(serializers.Serializer):
    """
    Serializer para criar pacote com itens
    """
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True)
    is_template = serializers.BooleanField(default=True)
    items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True
    )
    
    def validate_items(self, value):
        """Valida que cada item tem equipment_id e quantity"""
        for item in value:
            if 'equipment_id' not in item:
                raise serializers.ValidationError("Cada item deve ter 'equipment_id'")
            if 'quantity' not in item:
                item['quantity'] = 1
        return value
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        package = EquipmentPackage.objects.create(**validated_data)
        
        for item_data in items_data:
            PackageItem.objects.create(
                package=package,
                equipment_id=item_data['equipment_id'],
                quantity=item_data.get('quantity', 1),
                is_optional=item_data.get('is_optional', False)
            )
        
        return package
