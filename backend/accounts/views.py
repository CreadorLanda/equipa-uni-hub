from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.db.models import Q
from .models import User
from .serializers import (
    UserSerializer, UserPublicSerializer, LoginSerializer,
    AuthTokenSerializer, ChangePasswordSerializer
)


class AuthViewSet(viewsets.GenericViewSet):
    """
    ViewSet para autenticação (login, logout, registro)
    """
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Endpoint para login do usuário
        """
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token_data = AuthTokenSerializer.get_token_for_user(user)
            return Response(token_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        """
        Endpoint para logout do usuário
        """
        # Como estamos usando JWT stateless, apenas retornamos sucesso
        # O frontend deve descartar o token
        return Response(
            {'message': 'Logout realizado com sucesso.'}, 
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """
        Endpoint para obter dados do usuário autenticado
        """
        serializer = UserPublicSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        """
        Endpoint para mudança de senha
        """
        serializer = ChangePasswordSerializer(
            data=request.data, 
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'Senha alterada com sucesso.'}, 
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de usuários
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """
        Retorna o serializer apropriado baseado na ação
        """
        if self.action in ['list', 'retrieve']:
            return UserPublicSerializer
        return UserSerializer
    
    def get_queryset(self):
        """
        Filtra usuários baseado nos parâmetros de consulta
        """
        queryset = User.objects.all()
        
        # Filtro por função
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filtro por departamento
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department__icontains=department)
        
        # Busca por nome ou email
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(email__icontains=search) |
                Q(username__icontains=search)
            )
        
        # Filtro por status ativo
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.order_by('name')
    
    def perform_create(self, serializer):
        """
        Personaliza a criação de usuário
        """
        # Apenas coordenadores e secretários podem criar usuários
        if self.request.user.role not in ['coordenador', 'secretario']:
            raise permissions.PermissionDenied(
                'Apenas coordenadores e secretários podem criar usuários.'
            )
        serializer.save()
    
    def perform_update(self, serializer):
        """
        Personaliza a atualização de usuário
        """
        # Usuários podem editar seus próprios dados
        if self.get_object() == self.request.user:
            serializer.save()
            return
        
        # Apenas coordenadores e secretários podem editar outros usuários
        if self.request.user.role not in ['coordenador', 'secretario']:
            raise permissions.PermissionDenied(
                'Você não tem permissão para editar este usuário.'
            )
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Personaliza a exclusão de usuário (soft delete)
        """
        # Apenas coordenadores podem excluir usuários
        if self.request.user.role != 'coordenador':
            raise permissions.PermissionDenied(
                'Apenas coordenadores podem excluir usuários.'
            )
        
        # Não permite excluir a si mesmo
        if instance == self.request.user:
            raise permissions.PermissionDenied(
                'Você não pode excluir sua própria conta.'
            )
        
        # Soft delete - apenas marca como inativo
        instance.is_active = False
        instance.save()
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Ativa um usuário
        """
        if request.user.role != 'coordenador':
            return Response(
                {'error': 'Apenas coordenadores podem ativar usuários.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        user.is_active = True
        user.save()
        
        return Response(
            {'message': f'Usuário {user.name} ativado com sucesso.'}, 
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """
        Desativa um usuário
        """
        if request.user.role != 'coordenador':
            return Response(
                {'error': 'Apenas coordenadores podem desativar usuários.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        
        if user == request.user:
            return Response(
                {'error': 'Você não pode desativar sua própria conta.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = False
        user.save()
        
        return Response(
            {'message': f'Usuário {user.name} desativado com sucesso.'}, 
            status=status.HTTP_200_OK
        )
