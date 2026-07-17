# EQP-07: Tela de Conferência (Check Antes do Evento)

## Metadados
- **ID:** EQP-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** EQP-06

## Contexto
Antes de sair para um evento, o fotógrafo abre a conferência e marca cada equipamento como "conferido". A conferência é EFÊMERA (§27) — não persiste histórico, serve apenas como check visual de momento. O modelo de checklist define os itens; a conferência é o ato de confirmar.

## Escopo
- `apps/frontend/src/pages/admin/Conferencia.jsx` — NOVO
- `apps/frontend/src/components/equipamento/ConferenciaCard.jsx` — NOVO
- Sem backend novo (estado local / sessionStorage)
- Integração: acessar via Agenda (link no evento)

## Fora de Escopo (NÃO TOCAR)
- Backend/DynamoDB (conferência é efêmera, NÃO persiste)
- Modelo de checklist (EQP-06 — já existe)
- Módulo Agenda

## Spec Técnica

### Fluxo
```
1. Admin abre evento na Agenda
2. Clica "Conferir Equipamentos"
3. Sistema identifica tipo_evento do agendamento
4. Busca modelo(s) de checklist para esse tipo
5. Exibe lista de equipamentos com checkbox
6. Admin marca cada item como conferido
7. Ao marcar todos obrigatórios: badge verde "Conferido"
8. Estado salvo apenas em sessionStorage (efêmero)
```

### Frontend — Conferencia.jsx
- Header: nome do evento + data + tipo
- Lista de equipamentos do checklist:
  - Checkbox + nome + categoria + badge obrigatório
  - Itens obrigatórios em destaque (bold ou ícone)
  - Ao marcar: risca o texto (line-through) + check verde
- Progresso: "8 de 12 conferidos"
- Barra de progresso visual
- Botão "Concluir Conferência" (só habilita quando todos obrigatórios marcados)
- Após concluir: feedback visual (confete ou check grande)

### ConferenciaCard.jsx
- Item individual da conferência
- Checkbox animado
- Nome do equipamento + categoria
- Badge "Obrigatório" (vermelho) ou "Opcional" (cinza)
- Estado: não conferido (cinza), conferido (verde + line-through)

### Integração com Agenda
- Na tela de detalhe do evento (AGD-01): botão "Conferir Equipamentos"
- Badge no card do evento: ⚠️ (não conferido) ou ✅ (conferido)
- Badge é baseado em sessionStorage (efêmero, some ao fechar)

### Armazenamento Efêmero
```js
// sessionStorage key: conferencia_{evento_id}
// value: { checklist_id, itens_conferidos: ['eqp_001', 'eqp_003'], concluido: false }
```

### Se NÃO Existe Modelo para o Tipo de Evento
- Mensagem: "Nenhum checklist configurado para este tipo de evento"
- Link: "Criar checklist" → redireciona para EQP-06

## Critérios de Aceite
- [ ] Tela de conferência exibe equipamentos do checklist
- [ ] Checkbox marca/desmarca
- [ ] Itens obrigatórios em destaque
- [ ] Progresso visual (X de Y)
- [ ] Botão concluir só habilita com todos obrigatórios
- [ ] Estado em sessionStorage (efêmero)
- [ ] Integração via botão na Agenda
- [ ] Badge no evento (conferido/não conferido)
- [ ] Mensagem se não tem checklist para o tipo

## Prompt Pronto para o Kiro CLI

```
Implemente a spec EQP-07: Tela de Conferência.

1. Crie pages/admin/Conferencia.jsx: lista de equipamentos do checklist com checkboxes.
2. Crie components/equipamento/ConferenciaCard.jsx: item com checkbox animado, badge obrigatório.
3. Progresso visual + botão concluir (só com obrigatórios marcados).
4. Estado em sessionStorage (efêmero, sem backend).
5. Integração: botão na tela de evento (Agenda) + badge de status.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
