# ORC-02: Máquina de Estados com Duas Camadas (interno × cliente)

## Metadados
- **ID:** ORC-02
- **Tipo:** Correção
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
O sistema provavelmente tem um único campo `status` exposto tanto ao admin quanto ao cliente. A spec §6 define duas camadas: status interno (ADM) e status visível ao cliente. Sem isso, o cliente vê estados como "rascunho" ou "em revisão" que são irrelevantes pra ele.

## Escopo
- `apps/frontend/src/pages/admin/Orcamentos.jsx` — badges de status
- `apps/frontend/src/pages/admin/OrcamentoDetalhe.jsx` — transições
- Backend: Lambdas de orçamento — validar transições
- DynamoDB: campos `status_interno` + `status_cliente`

## Fora de Escopo (NÃO TOCAR)
- Formulário de criação (OrcamentoForm.jsx)
- Tela do cliente (portal)
- Notificações

## Spec Técnica

### Status Interno (ADM)
| Status | Descrição | Transições permitidas |
|---|---|---|
| `rascunho` | Criado, não finalizado | → em_revisao, cancelado |
| `em_revisao` | ADM está ajustando | → pronto_enviar, rascunho, cancelado |
| `pronto_enviar` | Pronto para enviar ao cliente | → enviado, em_revisao, cancelado |
| `enviado` | Cliente recebeu | → aceito, recusado, expirado |
| `aceito` | Cliente aceitou | → contrato_gerado |
| `recusado` | Cliente recusou | → em_revisao (reabrir) |
| `expirado` | Prazo venceu | → em_revisao (reabrir) |
| `contrato_gerado` | Contrato criado a partir do orçamento | (terminal) |
| `cancelado` | Cancelado pelo ADM | (terminal) |

### Status Cliente (visível no portal)
| Status Interno | Status Cliente |
|---|---|
| rascunho | (não visível) |
| em_revisao | (não visível) |
| pronto_enviar | (não visível) |
| enviado | "Proposta enviada" |
| aceito | "Aprovado" |
| recusado | "Recusado" |
| expirado | "Expirado" |
| contrato_gerado | "Contrato disponível" |
| cancelado | (não visível) |

### Frontend — Badges
```js
const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', color: 'gray', icon: 'Edit' },
  em_revisao: { label: 'Em revisão', color: 'blue', icon: 'RefreshCw' },
  pronto_enviar: { label: 'Pronto p/ enviar', color: 'purple', icon: 'Send' },
  enviado: { label: 'Enviado', color: 'orange', icon: 'Mail' },
  aceito: { label: 'Aceito', color: 'green', icon: 'CheckCircle' },
  recusado: { label: 'Recusado', color: 'red', icon: 'XCircle' },
  expirado: { label: 'Expirado', color: 'gray', icon: 'Clock' },
  contrato_gerado: { label: 'Contrato gerado', color: 'green', icon: 'FileText' },
  cancelado: { label: 'Cancelado', color: 'red', icon: 'Trash' },
}
```

### Backend — Validação de Transições
```js
const TRANSITIONS = {
  rascunho: ['em_revisao', 'cancelado'],
  em_revisao: ['pronto_enviar', 'rascunho', 'cancelado'],
  pronto_enviar: ['enviado', 'em_revisao', 'cancelado'],
  enviado: ['aceito', 'recusado', 'expirado'],
  aceito: ['contrato_gerado'],
  recusado: ['em_revisao'],
  expirado: ['em_revisao'],
}
```

### DynamoDB
- Adicionar atributos: `status_interno`, `status_cliente`
- Migrar `status` existente para `status_interno`
- `status_cliente` calculado automaticamente pelo backend

## Critérios de Aceite
- [ ] Admin vê status interno com cor e ícone
- [ ] Cliente vê apenas status cliente (portal)
- [ ] Transições inválidas são bloqueadas pelo backend (400)
- [ ] Botões de ação no detalhe mudam conforme status atual
- [ ] Rascunho não aparece para o cliente
- [ ] Transição de em_revisao direto para enviado é bloqueada
- [ ] Reabrir recusado/expirado volta para em_revisao

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-02: Máquina de Estados com Duas Camadas.

1. Backend:
   - Criar utils/orcamentoStateMachine.js com TRANSITIONS map e validateTransition(current, new)
   - Em updateOrcamentoStatus: validar transição, calcular status_cliente, salvar ambos
   - Rejeitar transições inválidas com 400 + mensagem clara

2. Em Orcamentos.jsx:
   - Atualizar badges com STATUS_CONFIG (label, color, icon)
   - Filtros por status interno

3. Em OrcamentoDetalhe.jsx:
   - Botões de ação dinâmicos conforme transições permitidas do status atual
   - Confirmar transições críticas (enviar, cancelar) com modal

4. DynamoDB: migrar campo status para status_interno. Adicionar status_cliente calculado.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
