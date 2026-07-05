from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import authenticate
from django.db.models import Q
from .models import User, AtribuidorEventual
from .serializers import (
    UserSerializer, UserPublicSerializer, LoginSerializer,
    AuthTokenSerializer, ChangePasswordSerializer
)
from .atribuidor_serializers import AtribuidorEventualSerializer


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


ADMIN_ROLES = ['admin']
TECH_OR_ADMIN = ['admin', 'tecnico']
SECRETARY_OR_ABOVE = ['admin', 'tecnico', 'secretario']


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return UserPublicSerializer
        elif self.action in ['atribuidores_list', 'atribuidores_create', 'atribuidores_update']:
            return AtribuidorEventualSerializer
        return UserSerializer

    def get_queryset(self):
        queryset = User.objects.all()

        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)

        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department__icontains=department)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(email__icontains=search) |
                Q(username__icontains=search)
            )

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('name')

    def perform_create(self, serializer):
        role = serializer.validated_data.get('role')

        if self.request.user.role not in ADMIN_ROLES:
            raise PermissionDenied('Apenas o Admin (Chefe da DTI) pode criar utilizadores.')

        if role in User.EXTERNAL_ROLES:
            from .external_person_service import external_person_service
            person_data = external_person_service.lookup_person(
                serializer.validated_data.get('email')
            )
            if not person_data:
                raise PermissionDenied(
                    f'Utilizadores com função "{role}" devem estar no Sistema de Gestão de Pessoas externo.'
                )
            serializer.save(
                is_external=True,
                external_id=person_data.get('external_id'),
                created_by=self.request.user
            )
        else:
            serializer.save(
                is_external=False,
                created_by=self.request.user
            )

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance == self.request.user:
            serializer.save()
            return
        if self.request.user.role not in SECRETARY_OR_ABOVE:
            raise PermissionDenied('Não tem permissão para editar este utilizador.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role not in TECH_OR_ADMIN:
            raise PermissionDenied('Apenas técnicos e admin podem remover utilizadores.')
        if instance == self.request.user:
            raise PermissionDenied('Não pode remover a sua própria conta.')
        instance.is_active = False
        instance.save()

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        if request.user.role not in ADMIN_ROLES:
            return Response({'error': 'Apenas o Admin pode ativar utilizadores.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'message': f'Utilizador {user.name} ativado com sucesso.'})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        if request.user.role not in ADMIN_ROLES:
            return Response({'error': 'Apenas o Admin pode desativar utilizadores.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        if user == request.user:
            return Response({'error': 'Não pode desativar a sua própria conta.'}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save()
        return Response({'message': f'Utilizador {user.name} desativado com sucesso.'})

    # ---- Atribuidores Eventuais CRUD (admin-only) ----
    @action(detail=False, methods=['get'])
    def atribuidores(self, request):
        if request.user.role not in ADMIN_ROLES:
            return Response({'error': 'Apenas Admin.'}, status=status.HTTP_403_FORBIDDEN)
        qs = AtribuidorEventual.objects.all().order_by('nome')
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(nome__icontains=search)
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        serializer = AtribuidorEventualSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def atribuidores_create(self, request):
        if request.user.role not in ADMIN_ROLES:
            return Response({'error': 'Apenas Admin.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = AtribuidorEventualSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put', 'patch'])
    def atribuidores_update(self, request, pk=None):
        if request.user.role not in ADMIN_ROLES:
            return Response({'error': 'Apenas Admin.'}, status=status.HTTP_403_FORBIDDEN)
        obj = AtribuidorEventual.objects.get(pk=pk)
        serializer = AtribuidorEventualSerializer(obj, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def atribuidores_activate(self, request, pk=None):
        if request.user.role not in ADMIN_ROLES:
            return Response({'error': 'Apenas Admin.'}, status=status.HTTP_403_FORBIDDEN)
        obj = AtribuidorEventual.objects.get(pk=pk)
        obj.is_active = True
        obj.save()
        return Response({'message': f'{obj.nome} ativado.'})

    @action(detail=True, methods=['post'])
    def atribuidores_deactivate(self, request, pk=None):
        if request.user.role not in ADMIN_ROLES:
            return Response({'error': 'Apenas Admin.'}, status=status.HTTP_403_FORBIDDEN)
        obj = AtribuidorEventual.objects.get(pk=pk)
        obj.is_active = False
        obj.save()
        return Response({'message': f'{obj.nome} desativado.'})
