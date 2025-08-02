from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Equipment
from .serializers import (
    EquipmentSerializer, EquipmentListSerializer, 
    EquipmentStatsSerializer
)


class EquipmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de equipamentos
    """
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'status', 'brand']
    search_fields = ['brand', 'model', 'serial_number', 'description', 'location']
    ordering_fields = ['brand', 'model', 'acquisition_date', 'created_at']
    ordering = ['brand', 'model']
    
    def get_serializer_class(self):
        """
        Retorna o serializer apropriado baseado na ação
        """
        if self.action == 'list':
            return EquipmentListSerializer
        return EquipmentSerializer
    
    def get_queryset(self):
        """
        Filtra equipamentos baseado nos parâmetros de consulta
        """
        queryset = Equipment.objects.all()
        
        # Filtro por disponibilidade
        available_only = self.request.query_params.get('available_only')
        if available_only and available_only.lower() == 'true':
            queryset = queryset.filter(status='disponivel')
        
        # Filtro por localização
        location = self.request.query_params.get('location')
        if location:
            queryset = queryset.filter(location__icontains=location)
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Personaliza a criação de equipamento
        """
        # Apenas técnicos, secretários e coordenadores podem criar equipamentos
        if self.request.user.role not in ['tecnico', 'secretario', 'coordenador']:
            raise permissions.PermissionDenied(
                'Você não tem permissão para criar equipamentos.'
            )
        serializer.save()
    
    def perform_update(self, serializer):
        """
        Personaliza a atualização de equipamento
        """
        # Apenas técnicos, secretários e coordenadores podem editar equipamentos
        if self.request.user.role not in ['tecnico', 'secretario', 'coordenador']:
            raise permissions.PermissionDenied(
                'Você não tem permissão para editar equipamentos.'
            )
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Personaliza a exclusão de equipamento
        """
        # Apenas coordenadores podem excluir equipamentos
        if self.request.user.role != 'coordenador':
            raise permissions.PermissionDenied(
                'Apenas coordenadores podem excluir equipamentos.'
            )
        
        # Verifica se o equipamento está emprestado ou reservado
        if instance.status in ['emprestado', 'reservado']:
            raise permissions.PermissionDenied(
                f'Não é possível excluir equipamento que está {instance.get_status_display().lower()}.'
            )
        
        super().perform_destroy(instance)
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """
        Lista apenas equipamentos disponíveis
        """
        available_equipment = self.get_queryset().filter(status='disponivel')
        
        # Aplica filtros de tipo se especificado
        equipment_type = request.query_params.get('type')
        if equipment_type:
            available_equipment = available_equipment.filter(type=equipment_type)
        
        serializer = EquipmentListSerializer(available_equipment, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Retorna estatísticas dos equipamentos
        """
        queryset = self.get_queryset()
        
        # Estatísticas básicas
        total_equipments = queryset.count()
        stats_by_status = queryset.values('status').annotate(count=Count('id'))
        stats_by_type = queryset.values('type').annotate(count=Count('id'))
        
        # Organiza as estatísticas
        status_counts = {item['status']: item['count'] for item in stats_by_status}
        type_counts = {item['type']: item['count'] for item in stats_by_type}
        
        stats_data = {
            'total_equipments': total_equipments,
            'available_equipments': status_counts.get('disponivel', 0),
            'loaned_equipments': status_counts.get('emprestado', 0),
            'reserved_equipments': status_counts.get('reservado', 0),
            'maintenance_equipments': status_counts.get('manutencao', 0),
            'inactive_equipments': status_counts.get('inativo', 0),
            'equipment_by_type': type_counts,
            'equipment_by_status': status_counts,
        }
        
        serializer = EquipmentStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def set_maintenance(self, request, pk=None):
        """
        Marca equipamento como em manutenção
        """
        if request.user.role not in ['tecnico', 'coordenador']:
            return Response(
                {'error': 'Apenas técnicos e coordenadores podem marcar equipamentos para manutenção.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        equipment = self.get_object()
        
        if equipment.status == 'emprestado':
            return Response(
                {'error': 'Não é possível colocar em manutenção equipamento emprestado.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        equipment.status = 'manutencao'
        equipment.save()
        
        return Response(
            {'message': f'Equipamento {equipment} marcado para manutenção.'}, 
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def set_available(self, request, pk=None):
        """
        Marca equipamento como disponível
        """
        if request.user.role not in ['tecnico', 'coordenador']:
            return Response(
                {'error': 'Apenas técnicos e coordenadores podem marcar equipamentos como disponíveis.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        equipment = self.get_object()
        equipment.status = 'disponivel'
        equipment.save()
        
        return Response(
            {'message': f'Equipamento {equipment} marcado como disponível.'}, 
            status=status.HTTP_200_OK
        )
