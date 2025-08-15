from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        # Apenas notificações do usuário autenticado
        return Notification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Força a notificação a ser criada para um usuário específico; padrão: current user
        user = serializer.validated_data.get('user', self.request.user)
        serializer.save(user=user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        count = Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({'updated': count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.save(update_fields=['read'])
        return Response({'status': 'ok'})


