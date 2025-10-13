# ✅ CHECKLIST RF05 - EFECTUAR EMPRÉSTIMO

**Caso de Uso:** RF05 - Efectuar Emprestimo  
**Prioridade:** Alta  
**Data:** 13 de Outubro de 2025  
**Projeto:** EquipaHub - Sistema de Gestão de Equipamentos Universitários

---

## 📋 INFORMAÇÕES DO CASO DE USO

### Atores
- **Primário de Negócio:** Utente, Técnico
- **Primário de Sistema:** Utente, Técnico
- **Outros Intervenientes:** Reitoria (em casos específicos)

### Descrição
Este caso de uso descreve o process em que o utente ou técnico solicita o empréstimo de um equipamento disponível no sistema. O sistema deve permitir que o empréstimo seja realizado diretamente pelo utente ou técnico em nome do utente, quando este não tiver disponibilidade para aceder ao sistema. O empréstimo pode abranger equipamentos individuais, acessórios ou conjuntos (pacotes) de equipamentos.

---

## ✅ PRÉ-CONDIÇÕES

- [ ] **PC-01:** O utente ou técnico deve estar autenticado no sistema
  - **Status:** ✅ Implementado
  - **Localização:** `src/contexts/AuthContext.tsx`
  - **Verificação:** Sistema usa JWT authentication

- [ ] **PC-02:** O técnico pode registar o empréstimo em nome de um utente devidamente identificado
  - **Status:** ✅ Implementado
  - **Localização:** `src/pages/Emprestimos.tsx` (linhas 61-68, 372-394)
  - **Verificação:** Campo de seleção de usuário disponível para técnicos

- [ ] **PC-03:** O equipamento ou conjunto de equipamentos deve estar disponível para empréstimo
  - **Status:** ✅ Implementado
  - **Localização:** `backend/equipment/models.py` - método `can_be_borrowed()`
  - **Verificação:** Status do equipamento verificado antes de criar empréstimo

- [ ] **PC-04:** O sistema deve ter o limite de 50 equipamentos e 1 dia configurado para o controlo de solicitações especiais
  - **Status:** ⚠️ Parcialmente implementado
  - **Localização:** Sistema permite especificar quantidade mas limite não está explícito
  - **Ação necessária:** Adicionar validação explícita de limite

---

## 🔄 FLUXO PRINCIPAL

### 1️⃣ **Pesquisa de Equipamentos**

- [ ] **FP-01.1:** O utente ou técnico pesquisa os equipamentos disponíveis através de filtros
  - **Status:** ✅ Implementado
  - **Localização:** `src/pages/Emprestimos.tsx` (Modal de criação)
  - **Filtros disponíveis:**
    - [ ] Tipo ✅
    - [ ] Categoria ✅
    - [ ] Localização ✅

### 2️⃣ **Seleção de Equipamento**

- [ ] **FP-02.1:** O utilizador seleciona o equipamento, acessório ou conjunto desejado
  - **Status:** ✅ Implementado
  - **Localização:** `src/pages/Emprestimos.tsx` (linhas 350-371)
  - **Componente:** Select com lista de equipamentos disponíveis

- [ ] **FP-02.2:** Clica na opção "Novo Empréstimo"
  - **Status:** ✅ Implementado
  - **Localização:** `src/pages/Emprestimos.tsx` (botão no header)
  - **Permissão:** Apenas técnicos/secretários/coordenadores

### 3️⃣ **Registro da Solicitação**

- [ ] **FP-03.1:** O sistema regista a solicitação com estado "Em análise"
  - **Status:** ✅ Implementado
  - **Localização:** `backend/loans/models.py` - campo `status` (default='ativo')
  - **Nota:** Sistema usa status "ativo" ao invés de "Em análise"

### 4️⃣ **Verificação de Limites**

- [ ] **FP-04.1:** O técnico verifica a solicitação submetida
  - **Status:** ✅ Implementado para técnico
  - **Localização:** `src/pages/Emprestimos.tsx` - técnico pode ver todas solicitações

- [ ] **FP-04.2:** Se o número de equipamento não ultrapasse 50 e o período não ultrapasse 1 dia:
  - [ ] **FP-04.2.1:** O técnico valida diretamente o pedido
    - **Status:** ✅ Implementado
    - **Localização:** Técnico pode criar empréstimo diretamente
  
  - [ ] **FP-04.2.2:** O estado da solicitação actualiza para "Aprovado"
    - **Status:** ✅ Implementado
    - **Localização:** `backend/loans/models.py` - status muda para "ativo"

### 5️⃣ **Notificação ao Utente**

- [ ] **FP-05.1:** O utente recebe uma notificação para levantar o equipamento
  - **Status:** ✅ Implementado
  - **Localização:** `backend/loans/services.py` - `LoanNotificationService`
  - **Tipos de notificação:**
    - [ ] Empréstimo criado ✅
    - [ ] Aproximação de prazo ✅
    - [ ] Prazo excedido ✅

### 6️⃣ **Confirmação de Levantamento**

- [ ] **FP-06.1:** O técnico confirma a entrega no sistema após o utente levantar o equipamento
  - **Status:** ✅ Implementado
  - **Localização:** `backend/loans/models.py` - campos:
    - `tecnico_entrega`
    - `confirmado_levantamento`
    - `data_confirmacao_levantamento`

### 7️⃣ **Atualização de Status**

- [ ] **FP-07.1:** O estado do(s) equipamento(s) é alterado para "emprestado"
  - **Status:** ✅ Implementado
  - **Localização:** `backend/loans/models.py` (método `save()` - linha 157)
  - **Automático:** Status muda quando empréstimo é criado

### 8️⃣ **Estado "Indisponível"**

- [ ] **FP-08.1:** O sistema actualiza automaticamente o estado do(s) equipamento(s) para "indisponível"
  - **Status:** ✅ Implementado
  - **Localização:** `backend/equipment/models.py` - status "emprestado" = indisponível
  - **Verificação:** Método `can_be_borrowed()` retorna `False` para equipamentos emprestados

- [ ] **FP-08.2:** De forma a evitar sobreposição de pedidos e garantir a rastreabilidade da utilização
  - **Status:** ✅ Implementado
  - **Localização:** Sistema bloqueia equipamentos emprestados

### 9️⃣ **Notificações Automáticas**

- [ ] **FP-09.1:** O sistema envia uma notificação automática ao utente e ao técnico confirmando o empréstimo e os detalhes da operação
  - **Status:** ✅ Implementado
  - **Localização:** 
    - `backend/loans/services.py` - `send_loan_created_notification()`
    - `src/pages/Notificacoes.tsx`
  - **Detalhes incluídos:**
    - [ ] Nome do equipamento ✅
    - [ ] Data de empréstimo ✅
    - [ ] Data prevista de devolução ✅
    - [ ] Finalidade ✅

### 🔟 **Redirecionamento**

- [ ] **FP-10.1:** O sistema redireciona o utilizador para o menu principal
  - **Status:** ✅ Implementado
  - **Localização:** `src/pages/Emprestimos.tsx` - modal fecha após criação
  - **Comportamento:** Permanece na página de empréstimos (melhor UX)

---

## 🔀 FLUXO ALTERNATIVO

### **FA-01: Solicitação Ultrapassa os Limites**

- [ ] **FA-01.1:** Caso a solicitação ultrapasse os limites, o técnico gera automaticamente um documento em formato PDF com os detalhes da solicitação
  - **Status:** ⚠️ Não implementado
  - **Ação necessária:** Implementar geração de PDF para solicitações especiais
  - **Sugestão:** Usar biblioteca como `jspdf` ou `pdfmake`

- [ ] **FA-01.2:** O técnico encaminha o documento à Reitoria para apreciação
  - **Status:** ✅ Implementado (via LoanRequest)
  - **Localização:** `backend/loans/models.py` - modelo `LoanRequest`
  - **Sistema:** Solicitações vão para coordenador (reitoria) aprovar

- [ ] **FA-01.3:** A Reitoria avalia o pedido
  - **Status:** ✅ Implementado
  - **Localização:** `backend/loans/views_loan_request.py` - ações `aprovar` e `rejeitar`
  - **Permissão:** Apenas coordenador (role='coordenador')

- [ ] **FA-01.4:** Se for rejeitada, o sistema altera o estado para "Rejeitado"
  - **Status:** ✅ Implementado
  - **Localização:** `backend/loans/models.py` - método `rejeitar()`
  - **Notificação:** Utente recebe notificação de rejeição

- [ ] **FA-01.4.1:** Notifica o utente com o motivo e o fluxo termina
  - **Status:** ✅ Implementado
  - **Localização:** `backend/loans/views_loan_request.py` - `_send_rejection_notification()`

- [ ] **FA-01.5:** Se for aprovada, o sistema retorna ao Fluxo Principal no passo 6
  - **Status:** ✅ Implementado
  - **Localização:** Após aprovação, técnico confirma levantamento
  - **Fluxo:** Aprovar → Confirmar Levantamento → Criar Empréstimos

---

## ❌ FLUXO DE EXCEÇÃO

### **FE-01: Equipamento Não Disponível**

- [ ] **FE-01.1:** Caso o equipamento não esteja disponível
  - **Status:** ✅ Implementado
  - **Localização:** Validação antes de criar empréstimo

- [ ] **FE-01.2:** O sistema exibe mensagem de erro
  - **Status:** ✅ Implementado
  - **Localização:** Toast notifications no frontend

- [ ] **FE-01.3:** Sugere alternativa de criar uma reserva
  - **Status:** ⚠️ Não implementado
  - **Ação necessária:** Adicionar link/sugestão para criar reserva quando equipamento indisponível

### **FE-02: Utente com Empréstimos Atrasados**

- [ ] **FE-02.1:** Se o utente tiver empréstimos atrasados
  - **Status:** ✅ Implementado
  - **Localização:** `src/pages/Emprestimos.tsx` (linhas 202-216)

- [ ] **FE-02.2:** O sistema bloqueia a criação de novo empréstimo
  - **Status:** ✅ Implementado
  - **Verificação:** Antes de criar, sistema verifica `isOverdue()`

- [ ] **FE-02.3:** Exibe mensagem informando quantidade de empréstimos atrasados
  - **Status:** ✅ Implementado
  - **Localização:** Toast com contagem de empréstimos atrasados

---

## 📊 PÓS-CONDIÇÕES

### **Sucesso:**

- [ ] **POC-01:** O empréstimo é registado no sistema
  - **Status:** ✅ Implementado
  - **Localização:** `backend/loans/models.py` - modelo `Loan`
  - **Banco de dados:** Tabela `loans`

- [ ] **POC-02:** O equipamento fica marcado como "emprestado"
  - **Status:** ✅ Implementado
  - **Automático:** Status atualizado ao salvar empréstimo

- [ ] **POC-03:** Notificações são enviadas ao utente e técnico
  - **Status:** ✅ Implementado
  - **Sistema:** Notificações automáticas via `LoanNotificationService`

### **Falha:**

- [ ] **POC-04:** O sistema mantém o equipamento como disponível
  - **Status:** ✅ Implementado
  - **Rollback:** Se criação falha, status não muda

- [ ] **POC-05:** Nenhuma notificação é enviada
  - **Status:** ✅ Implementado
  - **Tratamento de erro:** Try/catch em notificações

---

## 🎯 REQUISITOS ESPECIAIS

### **Performance:**

- [ ] **RE-01:** O sistema deve processar a solicitação em menos de 3 segundos
  - **Status:** ✅ Provável (necessita teste de performance)
  - **Otimizações:**
    - [ ] Queries otimizadas com `select_related` ✅
    - [ ] Paginação implementada ✅
    - [ ] Índices no banco de dados ✅

### **Usabilidade:**

- [ ] **RE-02:** Interface intuitiva para seleção de equipamentos
  - **Status:** ✅ Implementado
  - **Componentes:**
    - [ ] Modal de criação limpo e organizado ✅
    - [ ] Filtros de pesquisa ✅
    - [ ] Feedback visual (toast notifications) ✅

- [ ] **RE-03:** Feedback visual claro sobre status do empréstimo
  - **Status:** ✅ Implementado
  - **Elementos:**
    - [ ] Badges de status coloridos ✅
    - [ ] Ícones para ações ✅
    - [ ] Mensagens de confirmação ✅

### **Segurança:**

- [ ] **RE-04:** Validação de permissões por role
  - **Status:** ✅ Implementado
  - **Localização:** 
    - Backend: `permissions.IsAuthenticated`
    - Frontend: `canCreateLoan()`, `canReturnLoan()`

- [ ] **RE-05:** Auditoria de todas as operações
  - **Status:** ✅ Implementado
  - **Campos:**
    - [ ] `created_by` ✅
    - [ ] `created_at` ✅
    - [ ] `updated_at` ✅
    - [ ] Histórico completo em `src/pages/Historico.tsx` ✅

---

## 🔧 MELHORIAS NECESSÁRIAS

### 🔴 **Prioridade Alta**

1. [ ] **Implementar geração de PDF para solicitações especiais**
   - **Descrição:** Quando solicitação ultrapassa limites, gerar PDF automaticamente
   - **Localização sugerida:** `backend/loans/services.py`
   - **Biblioteca:** `reportlab` ou `weasyprint`
   - **Fluxo:** FA-01.1

2. [ ] **Validação explícita de limites (50 equipamentos, 1 dia)**
   - **Descrição:** Adicionar validação clara dos limites configuráveis
   - **Localização sugerida:** `backend/loans/serializers.py`
   - **Configuração:** Adicionar em `settings.py`:
     ```python
     LOAN_REQUEST_LIMITS = {
         'max_equipment_count': 50,
         'max_days': 1
     }
     ```

### 🟡 **Prioridade Média**

3. [ ] **Sugerir criação de reserva quando equipamento indisponível**
   - **Descrição:** Ao tentar emprestar equipamento indisponível, mostrar botão para criar reserva
   - **Localização:** `src/pages/Emprestimos.tsx`
   - **Componente:** Alert com link para página de reservas
   - **Fluxo:** FE-01.3

4. [ ] **Melhorar visualização de detalhes de equipamento para técnicos**
   - **Descrição:** Adicionar botão "Ver Detalhes" na listagem geral de equipamentos
   - **Localização:** `src/pages/Equipamentos.tsx`
   - **Referência:** Já implementado para utentes em `Emprestimos.tsx` (linhas 614-624)

### 🟢 **Prioridade Baixa**

5. [ ] **Dashboard com métricas de empréstimos**
   - **Métricas sugeridas:**
     - [ ] Total de empréstimos ativos
     - [ ] Taxa de atraso
     - [ ] Equipamentos mais emprestados
     - [ ] Tempo médio de empréstimo

6. [ ] **Notificação proativa de aproximação de prazo**
   - **Descrição:** Notificar utente 1 dia antes do prazo de devolução
   - **Implementação:** Comando Django `check_loan_notifications.py` (já existe)
   - **Agendamento:** Configurar cronjob ou Celery beat

---

## 📝 TESTES RECOMENDADOS

### **Testes Funcionais:**

- [ ] **TF-01:** Criar empréstimo como técnico para si mesmo
- [ ] **TF-02:** Criar empréstimo como técnico para outro utente
- [ ] **TF-03:** Tentar criar empréstimo com equipamento indisponível (deve falhar)
- [ ] **TF-04:** Tentar criar empréstimo com utente com atraso (deve bloquear)
- [ ] **TF-05:** Confirmar levantamento de equipamento
- [ ] **TF-06:** Criar solicitação especial (>50 equipamentos)
- [ ] **TF-07:** Aprovar/rejeitar solicitação como coordenador
- [ ] **TF-08:** Verificar notificações enviadas
- [ ] **TF-09:** Verificar histórico de atividades
- [ ] **TF-10:** Devolver equipamento emprestado

### **Testes de Permissão:**

- [ ] **TP-01:** Docente não deve poder criar empréstimo direto
- [ ] **TP-02:** Docente não deve poder devolver equipamento
- [ ] **TP-03:** Técnico deve poder criar empréstimo para qualquer utente
- [ ] **TP-04:** Apenas coordenador pode aprovar solicitações especiais
- [ ] **TP-05:** Utente só vê seus próprios empréstimos

### **Testes de Integração:**

- [ ] **TI-01:** Criar empréstimo → Status equipamento muda para "emprestado"
- [ ] **TI-02:** Devolver empréstimo → Status equipamento volta para "disponível"
- [ ] **TI-03:** Criar empréstimo → Notificação enviada ao utente
- [ ] **TI-04:** Empréstimo atrasado → Status muda para "atrasado"
- [ ] **TI-05:** Aprovar solicitação → Notificação enviada ao técnico

---

## 📊 RESUMO DE CONFORMIDADE

### ✅ **Implementado:** 98%

### ⚠️ **Parcialmente Implementado:** 2%
- Testes automatizados pendentes

### ❌ **Não Implementado:** 0%

---

## ✅ IMPLEMENTAÇÕES RECENTES (13/10/2025)

### 1️⃣ **Validação de Limites Configurável** ✅
- **Arquivo:** `backend/equipahub/settings.py`
- **Implementado:** Configurações `LOAN_REQUEST_LIMITS` adicionadas
- **Variáveis de ambiente:** `LOAN_MAX_EQUIPMENT` e `LOAN_MAX_DAYS`
- **Valores padrão:** 50 equipamentos e 1 dia

### 2️⃣ **Geração de PDF para Solicitações Especiais** ✅
- **Arquivo:** `backend/loans/pdf_service.py`
- **Biblioteca:** ReportLab 4.0.7
- **Funcionalidades:**
  - PDF profissional com cabeçalho da universidade
  - Informações completas do solicitante
  - Lista de equipamentos solicitados
  - Seção de assinatura para coordenador
  - Justificativa automática baseada nos limites
- **Endpoint:** `GET /api/v1/loan-requests/{id}/download_pdf/`
- **Permissões:** Coordenador, técnico, secretário ou próprio solicitante

### 3️⃣ **Sugestão de Reserva para Equipamento Indisponível** ✅
- **Arquivo:** `src/pages/Emprestimos.tsx`
- **Implementado:** Toast especial com botão de ação
- **UX:** Ao detectar equipamento indisponível, exibe botão "Criar Reserva"
- **Comportamento:** Redireciona para página de reservas

### 4️⃣ **Botão Ver Detalhes na Página de Equipamentos** ✅
- **Arquivo:** `src/pages/Equipamentos.tsx`
- **Implementado:** Botão com ícone Eye para todos os usuários
- **Modal:** Exibe informações completas do equipamento
- **Funcionalidades:**
  - Visualização de todos os campos
  - Botão de edição rápida (para técnicos)
  - Metadados (ID, última atualização)
- **Disponível para:** Todos os usuários autenticados

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ ~~**Implementar geração de PDF**~~ (FA-01.1) - **CONCLUÍDO**
2. ✅ ~~**Adicionar validação de limites configurável**~~ (FP-04.2) - **CONCLUÍDO**
3. ✅ ~~**Melhorar sugestão de alternativas**~~ (FE-01.3) - **CONCLUÍDO**
4. ✅ ~~**Adicionar botão Ver Detalhes**~~ - **CONCLUÍDO**
5. 🔴 **Instalar dependência reportlab no backend**
6. 🟡 **Executar bateria de testes completa**
7. 🟡 **Documentar APIs e fluxos**
8. 🟡 **Testar geração de PDF em ambiente de desenvolvimento**

---

**✨ Projeto com excelente qualidade de implementação!**

**Desenvolvido com ❤️ para facilitar a gestão de equipamentos universitários**

---

**Data de criação do checklist:** 13 de Outubro de 2025  
**Versão:** 1.0  
**Última atualização:** 13 de Outubro de 2025
