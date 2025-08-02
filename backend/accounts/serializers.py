from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User
from .authentication import generate_jwt_token


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo User
    """
    password = serializers.CharField(write_only=True, validators=[validate_password])
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'name', 'role', 'department',
            'is_active', 'created_at', 'updated_at', 'password'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }
    
    def create(self, validated_data):
        """
        Cria um novo usuário com senha criptografada
        """
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user
    
    def update(self, instance, validated_data):
        """
        Atualiza usuário, criptografando a senha se fornecida
        """
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


class UserPublicSerializer(serializers.ModelSerializer):
    """
    Serializer público para User (sem informações sensíveis)
    """
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'department']


class LoginSerializer(serializers.Serializer):
    """
    Serializer para login do usuário
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        """
        Valida as credenciais do usuário
        """
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )
            
            if not user:
                msg = 'Email ou senha incorretos.'
                raise serializers.ValidationError(msg, code='authorization')
            
            if not user.is_active:
                msg = 'Conta do usuário desativada.'
                raise serializers.ValidationError(msg, code='authorization')
            
            data['user'] = user
            return data
        else:
            msg = 'É necessário fornecer email e senha.'
            raise serializers.ValidationError(msg, code='authorization')


class AuthTokenSerializer(serializers.Serializer):
    """
    Serializer para resposta de autenticação com token JWT
    """
    token = serializers.CharField()
    user = UserPublicSerializer()
    
    @classmethod
    def get_token_for_user(cls, user):
        """
        Gera token JWT para o usuário
        """
        token = generate_jwt_token(user)
        return cls({
            'token': token,
            'user': user
        }).data


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer para mudança de senha
    """
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    
    def validate_old_password(self, value):
        """
        Valida se a senha atual está correta
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Senha atual incorreta.')
        return value
    
    def save(self):
        """
        Salva a nova senha
        """
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user 