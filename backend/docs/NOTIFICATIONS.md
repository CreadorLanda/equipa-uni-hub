# 🔔 Sistema de Notificações de Empréstimos

Este documento explica como funciona o sistema de notificações automáticas para empréstimos.

## 🎯 Funcionalidades

### ✅ Notificações Automáticas

1. **Empréstimo Criado**: Notificação de confirmação quando um empréstimo é registrado
2. **Lembrete de Devolução**: Enviado 2 horas antes do vencimento (configurável)
3. **Aviso de Atraso**: Enviado quando o empréstimo está em atraso
4. **Equipamento Devolvido**: Confirmação quando a devolução é processada

### ⏰ Tipos de Notificação

- **🟢 Sucesso** (success): Empréstimo criado, equipamento devolvido
- **🟡 Aviso** (warning): Lembretes de devolução próxima  
- **🔴 Alerta** (alert): Empréstimos em atraso
- **🔵 Info** (info): Informações gerais

## 🛠️ Configuração

### 1. Management Command

O sistema usa um management command para verificar empréstimos:

```bash
# Verificação básica
py manage.py check_loan_notifications

# Com configurações personalizadas
py manage.py check_loan_notifications --hours-before=3 --verbose

# Teste com informações detalhadas
py manage.py check_loan_notifications --verbose
```

### 2. Agendamento Automático

#### Windows (Task Scheduler)

1. Abra o **Agendador de Tarefas**
2. **Criar Tarefa Básica**:
   - Nome: "Verificação de Empréstimos"
   - Disparador: Diariamente, repetir a cada 30 minutos
   - Ação: Executar programa
   - Programa: `py`
   - Argumentos: `C:\caminho\para\projeto\backend\manage.py check_loan_notifications --hours-before=2`

#### Linux/Mac (Crontab)

```bash
# Editar crontab
crontab -e

# Adicionar linhas:
# Verifica a cada 30 minutos durante horário comercial (8h-18h)
*/30 8-18 * * * /caminho/para/python /caminho/para/manage.py check_loan_notifications --hours-before=2

# Verifica a cada hora fora do horário comercial
0 0-7,19-23 * * * /caminho/para/python /caminho/para/manage.py check_loan_notifications --hours-before=2
```

#### Docker

```dockerfile
# Adicionar ao Dockerfile
COPY scripts/loan_notifications_cron /etc/cron.d/loan_notifications
RUN chmod 0644 /etc/cron.d/loan_notifications
RUN crontab /etc/cron.d/loan_notifications
```

### 3. Script de Configuração

Execute o script auxiliar para configurar o agendamento:

```bash
python scripts/setup_loan_notifications.py
```

## 📊 Como Funciona

### Fluxo de Notificações

1. **Task Scheduler/Cron** executa o command a cada 30 minutos
2. **Management Command** chama o `LoanNotificationService`
3. **Serviço** verifica empréstimos próximos ao vencimento e em atraso
4. **Notificações** são criadas no banco de dados
5. **Frontend** exibe notificações em tempo real via API

### Lógica de Lembretes

- **Lembrete**: Enviado quando faltam X horas para vencimento (padrão: 2h)
- **Anti-spam**: Não envia lembrete se já foi enviado nas últimas 6 horas
- **Atraso**: Verifica empréstimos vencidos e atualiza status
- **Anti-spam atraso**: Não envia aviso se já foi enviado nas últimas 24 horas

### Detecção de Atraso

```python
# Empréstimos vencidos por data
expected_return_date < hoje

# Empréstimos vencidos por hora (se especificada)
expected_return_date + expected_return_time < agora
```

## 🚀 API de Notificações

### Endpoints Disponíveis

- `GET /api/v1/notifications/` - Lista notificações do usuário
- `POST /api/v1/notifications/{id}/mark_read/` - Marca como lida
- `POST /api/v1/notifications/mark_all_read/` - Marca todas como lidas

### Exemplo de Notificação

```json
{
    "id": 1,
    "type": "warning",
    "title": "⏰ Lembrete: Devolução em 2 horas",
    "message": "Empréstimo #123\\nEquipamento: MacBook Pro\\nData/Hora de devolução: 20/09/2025 às 18:00\\n\\nPor favor, prepare-se para devolver o equipamento no prazo.",
    "read": false,
    "action_required": true,
    "created_at": "2025-09-20T16:00:00Z",
    "timestamp": "2025-09-20T16:00:00.000Z"
}
```

## 🔧 Personalização

### Alterar Tempo de Lembrete

```python
# No management command
LoanNotificationService.check_upcoming_returns(hours_before=3)  # 3 horas antes
```

### Personalizar Mensagens

Edite o arquivo `loans/services.py`:

```python
# Método _send_return_reminder()
title = f"🔔 Seu empréstimo vence em {time_str}!"
message = "Mensagem personalizada..."
```

### Frequência de Verificação

Ajuste o cron/task scheduler:

```bash
# A cada 15 minutos
*/15 * * * * comando...

# A cada hora
0 * * * * comando...
```

## 📈 Monitoramento

### Logs

```bash
# Ver resultado da última execução
py manage.py check_loan_notifications --verbose

# Logs com redirecionamento
py manage.py check_loan_notifications >> logs/notifications.log 2>&1
```

### Métricas

- Número de lembretes enviados
- Número de avisos de atraso enviados  
- Tempo de execução
- Empréstimos verificados

## ⚠️ Considerações

1. **Performance**: O command é otimizado para verificações frequentes
2. **Anti-spam**: Sistema evita notificações duplicadas
3. **Tolerância a falhas**: Erros não interrompem o processo
4. **Timezone**: Usa configuração Django (`TIME_ZONE`)
5. **Banco**: Compatible com SQLite, MySQL, PostgreSQL

## 🐛 Troubleshooting

### Notificações não sendo enviadas

1. Verificar se o cron/task está executando
2. Testar o management command manualmente
3. Verificar logs de erro
4. Confirmar configuração de timezone

### Muitas notificações

1. Verificar frequência do agendamento
2. Ajustar logic anti-spam
3. Verificar cálculo de tempo de lembrete

### Teste Manual

```bash
# Criar empréstimo que vence em 1 hora para teste
py manage.py shell
>>> from loans.services import LoanNotificationService
>>> LoanNotificationService.check_upcoming_returns(hours_before=2)
```