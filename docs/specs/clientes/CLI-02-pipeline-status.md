# CLI-02: Pipeline de Status do Lead/Cliente

## Metadados
- **ID:** CLI-02
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Crítico
- **Esforço:** Médio
- **Dependência:** CLI-01

## Contexto
Sem pipeline, o admin não sabe em que estágio cada contato está. Precisa de uma máquina de estados: Lead → Contato → Negociação → Cliente → Inativo. Isso permite filtrar, priorizar follow-up e medir conversão.

## Escopo
- `apps/frontend/src/pages/admin/Clientes.jsx` — badges de status, filtro
- `apps/frontend/src/pages/admin/ClienteForm.jsx` — seletor de status
- `apps/frontend/src/pages/admin/ClienteDetalhe.jsx` — transição de status
- DynamoDB: campo `status` no item CLIENTE
- Backend: validar transições

## Fora de Escopo (NÃO TOCAR)
- Orçamentos (módulo separado)
- Automação de mudança de status (futuro)
- Notificações

## Spec Técnica

### Estados e Transições
```
Lead → Contato → Negociação → Cliente → Inativo
  ↑                                          ↓
  ←←←←←←←← Reativar ←←←←←←←←←←←←←←←←←←←←←
```

| Status | Cor | Descrição |
|---|---|---|
| lead | Cinza | Primeiro contato, sem resposta ainda |
| contato | Azul | Respondeu, em conversa |
| negociacao | Amarelo | Orçamento enviado, negociando |
| cliente | Verde | Fechou contrato |
| inativo | Vermelho | Sem interação há X dias / recusou |

### Transições Válidas
```js
const TRANSICOES_VALIDAS = {
  lead: ['contato', 'inativo'],
  contato: ['negociacao', 'inativo'],
  negociacao: ['cliente', 'contato', 'inativo'],
  cliente: ['inativo'],
  inativo: ['lead', 'contato']
}
```

### Frontend — Clientes.jsx
- Badge colorido ao lado do nome
- Filtro por status no topo
- Contadores por status (mini-kanban)

### Frontend — ClienteDetalhe.jsx
- Dropdown de transição (só mostra transições válidas)
- Histórico de mudanças de status com timestamp

### Backend
- Validar transição no updateCliente
- Gravar histórico: `{ de, para, em, por }`
- GSI: GSI_STATUS (PK: tenant_id, SK: status#created_at)

## Critérios de Aceite
- [ ] 5 status com cores e ícones
- [ ] Transições inválidas bloqueadas (400)
- [ ] Badge na listagem
- [ ] Filtro por status funciona
- [ ] Histórico de mudanças gravado
- [ ] Contadores por status no topo
- [ ] Reativar inativo funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-02: Pipeline de Status do Lead/Cliente.

1. Em Clientes.jsx: badges coloridos, filtro por status, contadores.
2. Em ClienteForm.jsx: seletor de status com transições válidas.
3. Em ClienteDetalhe.jsx: dropdown transição + histórico.
4. Backend: validar transições, gravar histórico, GSI_STATUS.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
