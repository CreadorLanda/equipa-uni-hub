# EquipaHub - Sistema de Gestão de Equipamentos Universitários

**Sistema completo para gestão de empréstimos e reservas de equipamentos em instituições de ensino.**

![EquipaHub](https://img.shields.io/badge/EquipaHub-Sistema%20de%20Gestão-blue)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![Django](https://img.shields.io/badge/Django-4.2.9-092E20?logo=django)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6?logo=typescript)

## 🚀 **Tecnologias Utilizadas**

### **Frontend**
- React 18.3.1 com TypeScript
- Vite para build e desenvolvimento
- Tailwind CSS para estilização
- Shadcn/UI para componentes
- Zustand para gerenciamento de estado
- React Router para navegação

### **Backend**
- Django 4.2.9 com Django REST Framework
- Autenticação JWT
- PostgreSQL/MySQL para banco de dados
- CORS configurado para integração

## 🏗️ **Estrutura do Projeto**

```
equipa-uni-hub/
├── src/                    # Frontend React
│   ├── components/         # Componentes reutilizáveis
│   ├── pages/             # Páginas da aplicação
│   ├── lib/               # Utilitários e configurações
│   ├── contexts/          # Contextos React
│   └── types/             # Definições TypeScript
├── backend/               # Backend Django
│   ├── equipahub/         # Configuração principal
│   ├── accounts/          # App de usuários
│   ├── equipment/         # App de equipamentos
│   ├── loans/             # App de empréstimos
│   └── reservations/      # App de reservas
└── docs/                  # Documentação
```

## ⚡ **Desenvolvimento Local**

### **Pré-requisitos**
- Node.js 18+ 
- Python 3.9+
- Yarn ou npm
- PostgreSQL/MySQL

### **Frontend**
```bash
# Instalar dependências
yarn install

# Iniciar desenvolvimento
yarn dev

# Build para produção
yarn build
```

### **Backend**
```bash
# Navegar para a pasta backend
cd backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Executar migrações
python manage.py migrate


# Iniciar servidor
python manage.py runserver
```

## 🔧 **Configuração**

### **Variáveis de Ambiente**

**Frontend (.env):**
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_URL=http://localhost:8000/api/v1
```

**Backend (backend/.env):**
```env
SECRET_KEY=sua_chave_secreta_aqui
DEBUG=True
DATABASE_URL=sua_url_de_banco_aqui
ALLOWED_HOSTS=localhost,127.0.0.1
```

## 🎯 **Funcionalidades**

### **👥 Gestão de Usuários**
- Autenticação JWT
- Roles: Coordenador, Secretário, Técnico, Docente
- Permissões baseadas em papel

### **💻 Gestão de Equipamentos**
- CRUD completo de equipamentos
- Status: Disponível, Emprestado, Reservado, Manutenção
- Categorização por tipo
- Histórico de uso

### **📋 Empréstimos**
- Criação e gestão de empréstimos
- Controle de prazos e atrasos
- Devoluções automatizadas
- Notificações

### **📅 Reservas**
- Sistema de reservas antecipadas
- Confirmação de reservas
- Conversão para empréstimos
- Gestão de filas

### **📊 Relatórios**
- Dashboard com estatísticas
- Geração de PDFs
- Filtros por período
- Exportação de dados

## 🚀 **Deploy**

### **Frontend (Vercel/Netlify)**
```bash
# Build do projeto
yarn build

# Deploy automático via Git
```

### **Backend (Railway/Heroku)**
```bash
# Configurar variáveis de ambiente
# Fazer deploy via Git
```

## 📱 **Credenciais de Teste**

- **Coordenador**: `admin@unihub.com` / `admin123`
- **Técnico**: `tecnico@unihub.com` / `tecnico123`
- **Secretária**: `secretaria@unihub.com` / `secretaria123`
- **Docente**: `ana.santos@unihub.com` / `docente123`

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 **Suporte**

Para suporte técnico ou dúvidas sobre o projeto:
- Abra uma issue no GitHub
- Entre em contato com a equipe de desenvolvimento

---

**Desenvolvido com ❤️ para facilitar a gestão de equipamentos universitários**
