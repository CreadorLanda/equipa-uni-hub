from django.shortcuts import render, get_object_or_404, redirect
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.http import HttpResponse
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
    
    TECH_ROLES = ['admin', 'tecnico']

    def perform_create(self, serializer):
        if self.request.user.role not in self.TECH_ROLES:
            raise permissions.PermissionDenied('Não tem permissão para criar equipamentos.')
        serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role not in self.TECH_ROLES:
            raise permissions.PermissionDenied('Não tem permissão para editar equipamentos.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role not in self.TECH_ROLES:
            raise permissions.PermissionDenied('Apenas técnicos e admin podem excluir equipamentos.')
        
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
    
    TECH_ROLES_LIST = ['admin', 'tecnico']

    @action(detail=True, methods=['post'])
    def set_maintenance(self, request, pk=None):
        if request.user.role not in self.TECH_ROLES_LIST:
            return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        equipment = self.get_object()
        if equipment.status == 'emprestado':
            return Response({'error': 'Não é possível colocar em manutenção equipamento emprestado.'}, status=status.HTTP_400_BAD_REQUEST)
        equipment.status = 'manutencao'
        equipment.save()
        return Response({'message': f'{equipment} marcado para manutenção.'})

    @action(detail=True, methods=['post'])
    def set_available(self, request, pk=None):
        if request.user.role not in self.TECH_ROLES_LIST:
            return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        equipment = self.get_object()
        equipment.status = 'disponivel'
        equipment.save()
        return Response({'message': f'{equipment} marcado como disponível.'})

    @action(detail=True, methods=['post'])
    def set_inactive(self, request, pk=None):
        if request.user.role not in self.TECH_ROLES_LIST:
            return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        equipment = self.get_object()
        if equipment.status == 'emprestado':
            return Response({'error': 'Não pode desativar equipamento emprestado.'}, status=status.HTTP_400_BAD_REQUEST)
        equipment.status = 'inativo'
        equipment.save()
        return Response({'message': f'{equipment} desativado.'})

    @action(detail=False, methods=['get'])
    def qrcode(self, request):
        hash = request.query_params.get('hash')
        if not hash:
            return Response({'error': 'Parâmetro hash é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        equipment = get_object_or_404(Equipment, qrcode_hash=hash)
        base_url = request.build_absolute_uri('/')[:-1]
        consult_url = f"{base_url}/consulta/{equipment.qrcode_hash}/"
        return HttpResponse(
            f'<html><body style="font-family:sans-serif;text-align:center;padding:40px">'
            f'<h2>{equipment.full_name}</h2>'
            f'<p>Serial: {equipment.serial_number} | Status: {equipment.get_status_display()}</p>'
            f'<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={consult_url}" alt="QR Code"/>'
            f'<p><a href="{consult_url}">Ver detalhes no sistema</a></p></body></html>'
        )

    @action(detail=False, methods=['get'], url_path='qrcode/(?P<hash>[^/.]+)')
    def qrcode_detail(self, request, hash=None):
        equipment = get_object_or_404(Equipment, qrcode_hash=hash)
        base_url = request.build_absolute_uri('/')[:-1]
        consult_url = f"{base_url}/consulta/{equipment.qrcode_hash}/"
        return HttpResponse(
            f'<html><body style="font-family:sans-serif;text-align:center;padding:40px">'
            f'<h2>{equipment.full_name}</h2>'
            f'<p>Serial: {equipment.serial_number} | Status: {equipment.get_status_display()}</p>'
            f'<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={consult_url}" alt="QR Code"/>'
            f'<p><a href="{consult_url}">Ver detalhes no sistema</a></p></body></html>'
        )
