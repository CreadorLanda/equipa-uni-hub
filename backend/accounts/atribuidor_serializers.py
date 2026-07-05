from rest_framework import serializers
from .models import AtribuidorEventual


class AtribuidorEventualSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.name')

    class Meta:
        model = AtribuidorEventual
        fields = [
            'id', 'nome', 'morada', 'grau_academico', 'entidade_empregadora',
            'sexo', 'funcao', 'funcao_outro',
            'is_active', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'created_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }
