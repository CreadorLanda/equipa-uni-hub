from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .package_models import EquipmentPackage, PackageItem
from .package_serializers import (
    EquipmentPackageSerializer,
    EquipmentPackageListSerializer,
    CreatePackageSerializer,
    PackageItemSerializer
)


class EquipmentPackageViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestão de pacotes de equipamentos
    """
    permission_classes = [IsAuthenticated]
    queryset = EquipmentPackage.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EquipmentPackageListSerializer
        elif self.action == 'create':
            return CreatePackageSerializer
        return EquipmentPackageSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrar por status ativo
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filtrar por template
        is_template = self.request.query_params.get('is_template')
        if is_template is not None:
            queryset = queryset.filter(is_template=is_template.lower() == 'true')
        
        return queryset.select_related('created_by').prefetch_related('items__equipment')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """Adiciona um item ao pacote"""
        package = self.get_object()
        serializer = PackageItemSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(package=package)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['delete'])
    def remove_item(self, request, pk=None):
        """Remove um item do pacote"""
        package = self.get_object()
        item_id = request.data.get('item_id')
        
        try:
            item = PackageItem.objects.get(id=item_id, package=package)
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PackageItem.DoesNotExist:
            return Response(
                {'error': 'Item não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplica um pacote existente"""
        original_package = self.get_object()
        
        with transaction.atomic():
            # Criar novo pacote
            new_package = EquipmentPackage.objects.create(
                name=f"{original_package.name} (Cópia)",
                description=original_package.description,
                created_by=request.user,
                is_template=False
            )
            
            # Copiar itens
            for item in original_package.items.all():
                PackageItem.objects.create(
                    package=new_package,
                    equipment=item.equipment,
                    quantity=item.quantity,
                    is_optional=item.is_optional
                )
        
        serializer = self.get_serializer(new_package)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """Lista apenas pacotes com todos os equipamentos disponíveis"""
        queryset = self.get_queryset().filter(is_active=True)
        available_packages = [pkg for pkg in queryset if pkg.is_available]
        
        serializer = self.get_serializer(available_packages, many=True)
        return Response(serializer.data)
