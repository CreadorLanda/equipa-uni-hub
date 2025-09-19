# 🔔 Sistema de Notificações em Tempo Real - Empréstimos

Sistema completo de notificações em tempo real para empréstimos, implementado no **React** com polling automático e notificações toast.

## ✨ Funcionalidades Implementadas

### 🎯 **Notificações Automáticas**
- **✅ Empréstimo Criado** - Confirmação quando registrado
- **⏰ Lembrete de Devolução** - 2 horas antes do vencimento
- **🚨 Aviso de Atraso** - Quando passa do prazo  
- **📦 Equipamento Devolvido** - Confirmação de devolução

### 🚀 **Sistema em Tempo Real**
- **Polling automático** a cada 30 segundos
- **Notificações Toast** para novas notificações
- **Badge com contador** no header
- **Dropdown interativo** com ações rápidas
- **Context global** para gerenciar estado

## 📁 Arquivos Criados/Modificados

### 🔧 **Backend**
```
backend/
├── loans/services.py                    # Serviço de notificações
├── loans/management/
│   └── commands/
│       └── check_loan_notifications.py # Command para verificação
├── loans/views.py                      # Integração com views (modificado)
├── scripts/
│   ├── setup_loan_notifications.py    # Configurador de agendamento
│   └── test_notifications.py          # Script de testes
└── docs/NOTIFICATIONS.md              # Documentação técnica
```

### ⚛️ **Frontend**
```
src/
├── contexts/NotificationContext.tsx    # Context de notificações
├── components/layout/
│   ├── NotificationDropdown.tsx       # Componente do header
│   └── MainLayout.tsx                 # Modificado para usar dropdown
├── pages/Notificacoes.tsx             # Modificado para usar context
└── App.tsx                            # Modificado com provider
```

## 🎮 Como Usar

### 1. **Backend - Verificação Manual**
```bash
# Testar o sistema
py manage.py check_loan_notifications --verbose

# Testar com configurações
py manage.py check_loan_notifications --hours-before=1 --verbose
```

### 2. **Executar Testes**
```bash
# Rodar script completo de testes
python scripts/test_notifications.py
```

### 3. **Frontend - Uso Automático**
O frontend funciona automaticamente com:
- **Polling** a cada 30 segundos
- **Notificações Toast** para novas notificações
- **Badge no header** mostrando contador
- **Dropdown** com últimas 5 notificações

## 🎯 **Fluxo Completo de Funcionamento**

### 📱 **No Frontend (React)**

1. **Context carrega** notificações ao fazer login
2. **Polling automático** verifica novas notificações a cada 30s
3. **Toast aparece** quando detecta nova notificação
4. **Badge atualiza** contador no header
5. **Usuário clica** no sino para ver detalhes

### ⚙️ **No Backend (Django)**

1. **Management command** roda periodicamente (agendado)
2. **Verifica empréstimos** próximos ao vencimento
3. **Verifica empréstimos** em atraso
4. **Cria notificações** no banco de dados
5. **Frontend consome** via API

## 📊 **Tipos de Notificações**

### ✅ **Sucesso (success)**
- Empréstimo registrado com sucesso
- Equipamento devolvido

### ⚠️ **Aviso (warning)**  
- Lembrete de devolução (2h antes)

### 🚨 **Alerta (alert)**
- Empréstimo em atraso

### 🔵 **Info (info)**
- Informações gerais

## ⚡ **Configurações do Sistema**

### **Polling Frontend**
```typescript
// Context: NotificationContext.tsx
const intervalId = setInterval(() => {
  fetchNotifications(true); // Com toast
}, 30000); // 30 segundos
```

### **Verificação Backend**
- **Lembretes**: 2 horas antes do vencimento
- **Anti-spam**: 6 horas entre lembretes
- **Anti-spam atraso**: 24 horas entre avisos

### **Agendamento Recomendado**
- **A cada 30 minutos** durante horário comercial (8h-18h)
- **A cada hora** fora do horário comercial

## 🔄 **Como Agendar (Opcional)**

### **Windows - Task Scheduler**
```batch
# Programa: py
# Argumentos: C:\caminho\manage.py check_loan_notifications --hours-before=2
# Repetir: A cada 30 minutos
```

### **Linux/Mac - Crontab**
```bash
# A cada 30 minutos durante horário comercial
*/30 8-18 * * * /caminho/python /caminho/manage.py check_loan_notifications --hours-before=2

# A cada hora fora do horário
0 0-7,19-23 * * * /caminho/python /caminho/manage.py check_loan_notifications --hours-before=2
```

## 🧪 **Testando o Sistema**

### **1. Teste Manual Rápido**
1. Criar um empréstimo que vence em 1 hora
2. Executar: `py manage.py check_loan_notifications --hours-before=2 --verbose`
3. Verificar se notificação aparece no frontend

### **2. Script de Testes Completo**
```bash
python scripts/test_notifications.py
```
Este script testa automaticamente:
- Criação de empréstimo → notificação
- Lembrete de vencimento → notificação 
- Atraso → notificação + status update
- Devolução → notificação

### **3. Verificar no Frontend**
1. Fazer login no sistema
2. Ir para `/notificacoes`
3. Verificar se notificações aparecem
4. Testar badge no header

## 📱 **Interface do Usuário**

### **Header com Badge**
```
[🔔 3] <- Badge vermelho com contador
```

### **Dropdown de Notificações**
```
🔔 Notificações                     [↻] [✓Todas]
─────────────────────────────────────────────
⚠️ Lembrete: Devolução em 2 horas        [👁][🗑️]
   MacBook Pro - 20/09/2025 às 18:00
   2h atrás                           [Nova][Ação]

🚨 Empréstimo em atraso há 3 horas        [👁][🗑️]  
   Dell Inspiron - Devolvido ontem
   1 dia atrás                            [Ação]
─────────────────────────────────────────────
                Ver todas as notificações
```

### **Toast Notifications**
```
🔔 ⏰ Lembrete: Devolução em 2 horas
   Empréstimo #123 - MacBook Pro...
   [Fechar após 5s]
```

## 🚀 **Resultado Final**

O sistema agora oferece **notificações em tempo real** completas:

✅ **Usuário cria empréstimo** → Notificação de confirmação  
✅ **2h antes do vencimento** → Lembrete via toast + badge  
✅ **Após vencimento** → Alerta de atraso via toast + badge  
✅ **Usuário devolve** → Confirmação via toast  
✅ **Visualização centralizada** → Página de notificações  
✅ **Interação rápida** → Dropdown no header com ações  

O sistema é **100% funcional** e integrado entre backend e frontend! 🎉