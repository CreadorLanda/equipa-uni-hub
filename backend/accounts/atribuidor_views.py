from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from .models import AtribuidorEventual
from .atribuidor_serializers import AtribuidorEventualSerializer


class AtribuidorEventualViewSet(viewsets.ModelViewSet):
    queryset = AtribuidorEventual.objects.all()
    serializer_class = AtribuidorEventualSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = AtribuidorEventual.objects.all()

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(nome__icontains=search) |
                Q(entidade_empregadora__icontains=search) |
                Q(funcao__icontains=search)
            )

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')

        return qs.order_by('nome')

    def perform_create(self, serializer):
        if self.request.user.role != 'admin':
            raise PermissionDenied('Apenas o Admin (Chefe da DTI) pode registar atribuidores eventuais.')
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if self.request.user.role != 'admin':
            raise PermissionDenied('Apenas o Admin pode editar atribuidores eventuais.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != 'admin':
            raise PermissionDenied('Apenas o Admin pode remover atribuidores eventuais.')
        instance.is_active = False
        instance.save()

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Apenas o Admin pode ativar.'}, status=status.HTTP_403_FORBIDDEN)
        obj = self.get_object()
        obj.is_active = True
        obj.save()
        return Response({'message': f'{obj.nome} ativado com sucesso.'})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Apenas o Admin pode desativar.'}, status=status.HTTP_403_FORBIDDEN)
        obj = self.get_object()
        obj.is_active = False
        obj.save()
        return Response({'message': f'{obj.nome} desativado com sucesso.'})
