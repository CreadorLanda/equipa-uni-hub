# Backend Django - Equipa Uni Hub

## 🚀 Configuração Completa

O backend Django está configurado e rodando com:
- ✅ Banco MySQL no Railway conectado
- ✅ APIs REST completas
- ✅ Sistema de autenticação JWT
- ✅ Dados iniciais criados
- ✅ Django Admin configurado

## 📊 Dados de Acesso

### Usuários Criados:
- **Admin**: `admin@unihub.com` | Senha: `admin123` (Coordenador/Superusuário)
- **Técnico**: `tecnico@unihub.com` | Senha: `tecnico123`
- **Secretaria**: `secretaria@unihub.com` | Senha: `secretaria123`
- **Docentes**:
  - `ana.santos@unihub.com` | Senha: `docente123`
  - `joao.oliveira@unihub.com` | Senha: `docente123`
  - `maria.costa@unihub.com` | Senha: `docente123`

## 🌐 URLs da API

### Base URL: `http://localhost:8000/api/v1/`

### Endpoints Principais:

#### 🔐 Autenticação
- `POST /auth/login/` - Login
- `POST /auth/logout/` - Logout
- `GET /auth/me/` - Dados do usuário logado
- `POST /auth/change_password/` - Alterar senha

#### 👥 Usuários
- `GET /users/` - Listar usuários
- `POST /users/` - Criar usuário
- `GET /users/{id}/` - Detalhes do usuário
- `PUT /users/{id}/` - Atualizar usuário
- `DELETE /users/{id}/` - Excluir usuário

#### 🖥️ Equipamentos
- `GET /equipment/` - Listar equipamentos
- `POST /equipment/` - Criar equipamento
- `GET /equipment/{id}/` - Detalhes do equipamento
- `PUT /equipment/{id}/` - Atualizar equipamento
- `DELETE /equipment/{id}/` - Excluir equipamento
- `GET /equipment/available/` - Equipamentos disponíveis
- `GET /equipment/stats/` - Estatísticas de equipamentos

#### 📦 Empréstimos
- `GET /loans/` - Listar empréstimos
- `POST /loans/` - Criar empréstimo
- `GET /loans/{id}/` - Detalhes do empréstimo
- `PUT /loans/{id}/` - Atualizar empréstimo
- `DELETE /loans/{id}/` - Excluir empréstimo
- `GET /loans/active/` - Empréstimos ativos
- `GET /loans/overdue/` - Empréstimos atrasados
- `GET /loans/my_loans/` - Meus empréstimos
- `POST /loans/{id}/return_equipment/` - Devolver equipamento
- `GET /loans/stats/` - Estatísticas de empréstimos

#### 📅 Reservas
- `GET /reservations/` - Listar reservas
- `POST /reservations/` - Criar reserva
- `GET /reservations/{id}/` - Detalhes da reserva
- `PUT /reservations/{id}/` - Atualizar reserva
- `DELETE /reservations/{id}/` - Excluir reserva
- `GET /reservations/active/` - Reservas ativas
- `GET /reservations/expiring_soon/` - Reservas expirando
- `GET /reservations/my_reservations/` - Minhas reservas
- `POST /reservations/{id}/confirm/` - Confirmar reserva
- `POST /reservations/{id}/cancel/` - Cancelar reserva
- `POST /reservations/{id}/convert_to_loan/` - Converter em empréstimo
- `GET /reservations/stats/` - Estatísticas de reservas

#### 📈 Dashboard
- `GET /dashboard/stats/` - Estatísticas gerais do sistema

## 🔧 Configuração do Frontend

### 1. Instalar dependências do frontend
```bash
cd ../  # volta para a raiz do projeto
yarn install
```

### 2. Configurar variáveis de ambiente
Crie ou atualize o arquivo `.env` no frontend:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_URL=http://localhost:8000/api/v1
```

### 3. Atualizar serviços de API no frontend

#### Criar arquivo `src/lib/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Configuração base do axios ou fetch
export const api = {
  baseURL: API_BASE_URL,
  
  // Helper para fazer requests autenticados
  request: async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token');
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  // Métodos específicos
  get: (endpoint: string) => api.request(endpoint),
  post: (endpoint: string, data: any) => api.request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (endpoint: string, data: any) => api.request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (endpoint: string) => api.request(endpoint, {
    method: 'DELETE',
  }),
};
```

#### Atualizar contexto de autenticação `src/contexts/AuthContext.tsx`:
```typescript
import { api } from '@/lib/api';

// No método login:
const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/auth/login/', { email, password });
    const { token, user } = response;
    
    localStorage.setItem('auth_token', token);
    setUser(user);
    return true;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
};

// No método logout:
const logout = async () => {
  try {
    await api.post('/auth/logout/', {});
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('auth_token');
    setUser(null);
  }
};
```

### 4. Iniciar o frontend
```bash
yarn dev
```

## 🔒 Autenticação JWT

O sistema usa JWT para autenticação. Após o login:
1. O token é retornado no response
2. Armazene o token no localStorage
3. Inclua o token no header: `Authorization: Bearer {token}`
4. O token expira em 7 dias

## 📱 Testando a API

### Exemplo de login:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@unihub.com", "password": "admin123"}'
```

### Exemplo de uso com token:
```bash
curl -X GET http://localhost:8000/api/v1/equipment/ \
  -H "Authorization: Bearer {seu_token_aqui}"
```

## 🛠️ Django Admin

Acesse: `http://localhost:8000/admin/`
- Usuário: `admin@unihub.com`
- Senha: `admin123`

## ⚡ Comandos Úteis

```bash
# Executar migrations
python manage.py migrate

# Criar dados iniciais
python manage.py create_initial_data

# Resetar dados (cuidado!)
python manage.py create_initial_data --reset

# Criar superusuário
python manage.py createsuperuser

# Executar servidor
python manage.py runserver
```

## 🔧 Estrutura de Dados

O sistema está baseado exatamente nas interfaces TypeScript do frontend:
- ✅ User (com roles: tecnico, docente, secretario, coordenador)
- ✅ Equipment (com types e status)
- ✅ Loan (empréstimos com validações)
- ✅ Reservation (reservas com expiração automática)

## 🎯 Próximos Passos

1. ✅ Backend completo configurado
2. 🔄 Conectar frontend ao backend
3. 🔄 Testar todas as funcionalidades
4. 🔄 Ajustar permissões conforme necessário
5. �� Deploy em produção 