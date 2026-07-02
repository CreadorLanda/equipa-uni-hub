"""
Serviço de integração com o Sistema de Gestão de Pessoas externo.

Este módulo implementa a camada de integração que consulta o sistema
externo para validar/buscar dados de docentes, secretários e coordenadores.

O cadastro LOCAL é mantido apenas para "atribuidores eventuais" (técnicos),
registrados exclusivamente pelo administrador (chefe da DTI).
"""

import logging
from django.conf import settings
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


class ExternalPersonService:
    """
    Cliente de API para consultar o Sistema de Gestão de Pessoas externo.
    
    Configuração esperada no settings.py:
        EXTERNAL_PERSON_API = {
            'base_url': 'https://...',
            'api_key': '...',
            'timeout': 30,
        }
    
    Em ambiente de desenvolvimento/sem integração real, retorna mock data.
    """

    def __init__(self):
        self.config = getattr(settings, 'EXTERNAL_PERSON_API', {})
        self.base_url = self.config.get('base_url', '')
        self.api_key = self.config.get('api_key', '')
        self.timeout = self.config.get('timeout', 10)

    def _is_configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    def lookup_person(self, email: str) -> Optional[Dict]:
        """
        Consulta uma pessoa no sistema externo por email.
        Retorna os dados da pessoa ou None se não encontrada.
        """
        if not self._is_configured():
            return self._mock_lookup(email)
        try:
            return self._api_call(f'/pessoas/{email}')
        except Exception as e:
            logger.error(f"Erro ao consultar sistema externo: {e}")
            return None

    def search_persons(self, query: str) -> List[Dict]:
        """
        Pesquisa pessoas no sistema externo.
        """
        if not self._is_configured():
            return []
        try:
            return self._api_call(f'/pessoas?q={query}')
        except Exception as e:
            logger.error(f"Erro ao pesquisar no sistema externo: {e}")
            return []

    def validate_person(self, email: str) -> bool:
        """
        Valida se uma pessoa existe no sistema externo.
        """
        person = self.lookup_person(email)
        return person is not None

    def _api_call(self, path: str) -> Optional[Dict]:
        """
        Realiza chamada HTTP ao sistema externo.
        A implementação real usará requests/httpx.
        """
        import requests
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
        }
        url = f"{self.base_url}{path}"
        response = requests.get(url, headers=headers, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def _mock_lookup(self, email: str) -> Optional[Dict]:
        """
        Mock para desenvolvimento - retorna dados simulados.
        """
        mock_data = {
            'admin@universidade.ao': {
                'name': 'Admin DTI',
                'email': 'admin@universidade.ao',
                'role': 'coordenador',
                'department': 'DTI',
                'external_id': 'EXT-001',
            },
            'reitor@universidade.ao': {
                'name': 'Reitor da Universidade',
                'email': 'reitor@universidade.ao',
                'role': 'coordenador',
                'department': 'Reitoria',
                'external_id': 'EXT-002',
            },
            'secretario@universidade.ao': {
                'name': 'Secretário Acadêmico',
                'email': 'secretario@universidade.ao',
                'role': 'secretario',
                'department': 'Secretaria',
                'external_id': 'EXT-003',
            },
            'docente@universidade.ao': {
                'name': 'Docente Exemplo',
                'email': 'docente@universidade.ao',
                'role': 'docente',
                'department': 'Engenharia',
                'external_id': 'EXT-004',
            },
        }
        return mock_data.get(email)


# Singleton para uso nos views
external_person_service = ExternalPersonService()
