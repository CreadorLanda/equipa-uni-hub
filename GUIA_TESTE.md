# 🚀 Guia Rápido de Teste - Sistema de Solicitações

## ✅ Status da Implementação

**Backend:** ✅ 100% Completo e Funcionando
- Migrations aplicadas com sucesso
- Modelos `Loan` e `LoanRequest` criados no banco de dados
- Endpoints disponíveis e funcionais

**Frontend:** ⚠️ 95% Completo
- Falta apenas: Adicionar rota e link no menu

---

## 🔧 Pré-requisitos

1. **Backend rodando:**
```bash
cd backend
.\venv\Scripts\activate
py manage.py runserver
```

2. **Frontend rodando:**
```bash
# Em outro terminal
cd ..
npm run dev
```

---

## 📍 Passos para Completar (5 minutos)

### 1. Adicionar Rota no App.tsx

**Arquivo:** `src/App.tsx`

Adicione a importação:
```typescript
import { Solicitacoes } from '@/pages/Solicitacoes';
```

Adicione a rota dentro de `<Routes>`:
```typescript
<Route 
  path="/solicitacoes" 
  element={
    <ProtectedRoute>
      <MainLayout>
        <Solicitacoes />
      </MainLayout>
    </ProtectedRoute>
  } 
/>
```

### 2. Adicionar Link no Menu

**Arquivo:** `src/components/layout/AppSidebar.tsx`

Encontre o array de itens do menu e adicione:
```typescript
{
  title: "Solicitações",
  url: "/solicitacoes",
  icon: FileText, // Já existe no import
  roles: ['tecnico', 'secretario', 'coordenador', 'docente']
}
```

---

## 🧪 Como Testar

### Teste 1: Criar Solicitação (Qualquer Usuário)

1. Acesse: `http://localhost:5173/solicitacoes`
2. Clique em **"Nova Solicitação"**
3. Preencha:
   - Quantidade: **7** (ou qualquer número > 5)
   - Finalidade: "Teste de equipamentos para aula prática"
   - Data de Devolução: Amanhã
   - Hora: 14:00
4. Clique em **"Enviar Solicitação"**
5. ✅ Deve aparecer mensagem de sucesso
6. ✅ Deve aparecer na tab "Pendentes"

### Teste 2: Aprovar Solicitação (Coordenador)

1. Faça login com usuário **role = "coordenador"**
2. Acesse: `http://localhost:5173/solicitacoes`
3. Na tab **"Pendentes"**, clique em **"Aprovar"**
4. Adicione um motivo (opcional): "Aprovado para uso na aula"
5. Confirme
6. ✅ Status deve mudar para "Autorizado"
7. ✅ Solicitação deve aparecer na tab "Autorizadas"
8. ✅ Usuário solicitante deve receber notificação

### Teste 3: Rejeitar Solicitação (Coordenador)

1. Crie outra solicitação
2. Como coordenador, clique em **"Rejeitar"**
3. **Motivo é obrigatório**: "Equipamentos indisponíveis"
4. Confirme
5. ✅ Status deve mudar para "Rejeitado"
6. ✅ Usuário deve receber notificação com motivo

### Teste 4: Confirmar Levantamento (Técnico)

1. Faça login com usuário **role = "tecnico"**
2. Acesse a tab **"Autorizadas"**
3. Clique em **"Confirmar Levantamento"**
4. Adicione observação (opcional): "Equipamentos entregues em perfeito estado"
5. Confirme
6. ✅ Deve aparecer badge "Confirmado"
7. ✅ Técnico deve ser registrado
8. ✅ Usuário deve receber notificação

### Teste 5: Verificar Empréstimo Normal (Técnico)

1. Acesse: `http://localhost:5173/emprestimos`
2. Crie um empréstimo normal (1 equipamento)
3. ✅ Deve criar normalmente
4. ⚠️ Falta adicionar: Botão "Confirmar Levantamento" e coluna "Técnico"

---

## 🔍 Endpoints Disponíveis para Teste (Postman/Insomnia)

**Base URL:** `http://localhost:8000/api/v1`

### Loan Requests

```bash
# Listar todas
GET /loan-requests/

# Listar pendentes
GET /loan-requests/pendentes/

# Listar autorizadas
GET /loan-requests/autorizadas/

# Criar nova
POST /loan-requests/
Body: {
  "user": 1,
  "equipments": [1, 2, 3],
  "quantity": 7,
  "purpose": "Teste",
  "expected_return_date": "2025-10-15",
  "expected_return_time": "14:00",
  "notes": "Opcional"
}

# Aprovar (apenas coordenador)
POST /loan-requests/{id}/aprovar/
Body: {
  "motivo": "Aprovado para uso"
}

# Rejeitar (apenas coordenador)
POST /loan-requests/{id}/rejeitar/
Body: {
  "motivo": "Motivo da rejeição (obrigatório)"
}

# Confirmar levantamento (técnico)
POST /loan-requests/{id}/confirmar_levantamento/
Body: {
  "notes": "Observações (opcional)"
}
```

### Loans

```bash
# Confirmar levantamento de empréstimo normal
POST /loans/{id}/confirmar_levantamento/
Body: {
  "notes": "Observações (opcional)"
}
```

---

## 📊 Estrutura do Banco de Dados

### Tabela: loans
Novos campos adicionados:
- `tecnico_entrega_id` (FK para users)
- `confirmado_levantamento` (boolean)
- `data_confirmacao_levantamento` (datetime)

### Tabela: loan_requests (NOVA)
Campos principais:
- `id`, `user_id`, `quantity`, `purpose`
- `expected_return_date`, `expected_return_time`
- `status` (pendente/autorizado/rejeitado)
- `aprovado_por_id`, `motivo_decisao`, `data_decisao`
- `tecnico_responsavel_id`, `confirmado_pelo_tecnico`, `data_levantamento`
- `created_at`, `updated_at`

### Tabela: loan_requests_equipments (NOVA - ManyToMany)
- `loanrequest_id`
- `equipment_id`

---

## 🎯 Checklist Final

- ✅ Backend 100% implementado
- ✅ Migrations executadas
- ✅ Modelos criados no banco
- ✅ Endpoints funcionais
- ✅ Sistema de notificações integrado
- ✅ Página Solicitações criada
- ✅ Tipos TypeScript atualizados
- ✅ API client configurado
- ⚠️ Adicionar rota no App.tsx
- ⚠️ Adicionar link no menu
- ⚠️ Atualizar página Emprestimos.tsx (opcional, mas recomendado)

---

## 🐛 Solução de Problemas

**Erro 404 ao acessar /solicitacoes:**
- Adicione a rota no `App.tsx` (veja Passo 1 acima)

**Não aparece no menu:**
- Adicione o link no `AppSidebar.tsx` (veja Passo 2 acima)

**Erro 500 ao criar solicitação:**
- Verifique se o backend está rodando
- Verifique se as migrations foram aplicadas
- Verifique o console do backend para ver o erro específico

**Não recebe notificações:**
- Verifique se a tabela `notifications` existe
- Verifique se o sistema de notificações está configurado
- As notificações são criadas no backend automaticamente

---

## 📚 Documentação Completa

Para mais detalhes, veja: `IMPLEMENTACAO_SOLICITACOES.md`

---

**Última atualização:** 08/10/2025
**Status:** Pronto para testar! 🚀
