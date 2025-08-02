import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions
from datetime import datetime, timedelta


User = get_user_model()


class JWTAuthentication(authentication.BaseAuthentication):
    """
    Autenticação JWT customizada
    """
    authentication_header_prefix = 'Bearer'

    def authenticate(self, request):
        """
        Método principal de autenticação
        """
        request.user = None

        # Pega o header de autorização
        auth_header = authentication.get_authorization_header(request).split()
        auth_header_prefix = self.authentication_header_prefix.lower()

        if not auth_header:
            return None

        if len(auth_header) == 1:
            # Token inválido, não deve retornar nada
            return None

        elif len(auth_header) > 2:
            # Token inválido, header de autorização não deve conter espaços
            return None

        # Decodifica o prefixo e token
        prefix = auth_header[0].decode('utf-8')
        token = auth_header[1].decode('utf-8')

        if prefix.lower() != auth_header_prefix:
            # Prefixo de autorização não é o esperado
            return None

        # Autentica as credenciais
        return self._authenticate_credentials(request, token)

    def _authenticate_credentials(self, request, token):
        """
        Autentica o token JWT
        """
        try:
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET_KEY, 
                algorithms=[settings.JWT_ALGORITHM]
            )
        except jwt.InvalidTokenError:
            msg = 'Token de autenticação inválido.'
            raise exceptions.AuthenticationFailed(msg)

        try:
            user = User.objects.get(pk=payload['user_id'])
        except User.DoesNotExist:
            msg = 'Usuário não encontrado para este token.'
            raise exceptions.AuthenticationFailed(msg)

        if not user.is_active:
            msg = 'Conta do usuário desativada.'
            raise exceptions.AuthenticationFailed(msg)

        return (user, token)


def generate_jwt_token(user):
    """
    Gera um token JWT para o usuário
    """
    dt = datetime.now() + timedelta(seconds=settings.JWT_EXPIRATION_DELTA)

    token = jwt.encode({
        'user_id': user.pk,
        'exp': int(dt.timestamp())
    }, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    return token


def verify_jwt_token(token):
    """
    Verifica se um token JWT é válido
    """
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.InvalidTokenError:
        return None 