# EQP-10: Badge no Evento (Checklist Pendente/Conferido)

## Metadados
- **ID:** EQP-10
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Baixo
- **Dependência:** EQP-07

## Contexto
Na listagem da Agenda e no card do evento, exibir um badge indicando se o checklist de equipamentos já foi conferido ou está pendente. Informação visual rápida para o fotógrafo.

## Escopo
- `apps/frontend/src/pages/admin/Agenda.jsx` — ALTERAR (adicionar badge)
- `apps/frontend/src/components/agenda/EventoCard.jsx` — ALTERAR (badge de conferência)

## Fora de Escopo (NÃO TOCAR)
- Backend (badge é baseado em sessionStorage, efêmero)
- Conferência (EQP-07 — já feito)
- Modelo de checklist (EQP-06)

## Spec Técnica

### Badge
| Estado | Visual | Condição |
|---|---|---|
| Sem checklist | Nenhum badge | Tipo de evento não tem modelo de checklist |
| Pendente | ⚠️ Amarelo "Equipamentos" | Tem checklist mas não conferiu |
| Conferido | ✅ Verde "Equipamentos" | sessionStorage indica concluído |

### Lógica
```js
function getBadgeConferencia(eventoId, tipoEventoId) {
  // 1. Verificar se tipo de evento tem modelo de checklist
  const temChecklist = checklistModelos.some(m => m.tipo_evento_id === tipoEventoId)
  if (!temChecklist) return null
  
  // 2. Verificar sessionStorage
  const conferencia = sessionStorage.getItem(`conferencia_${eventoId}`)
  if (conferencia && JSON.parse(conferencia).concluido) return 'conferido'
  
  return 'pendente'
}
```

### Integração com Agenda
- Badge posicionado ao lado do horário/título do evento
- Click no badge → abre tela de Conferência (EQP-07)
- Tooltip: "Clique para conferir equipamentos"

### Consideração
- Como é efêmero (sessionStorage), o badge reseta ao fechar o navegador
- Isso é intencional: conferência é ato de momento (§27)
- Futuro (fora desta spec): persistir se admin quiser histórico

## Critérios de Aceite
- [ ] Badge aparece nos eventos que têm checklist
- [ ] Sem badge se tipo não tem checklist
- [ ] Badge amarelo = pendente
- [ ] Badge verde = conferido
- [ ] Click abre conferência
- [ ] Badge some ao fechar navegador (efêmero)
- [ ] Tooltip funciona

## Prompt Pronto para o Kiro CLI

```
Implemente a spec EQP-10: Badge no Evento.

1. Em Agenda.jsx / EventoCard.jsx: adicionar badge de conferência.
2. Lógica: verificar se tipo tem checklist → verificar sessionStorage.
3. Badge amarelo (pendente) ou verde (conferido).
4. Click no badge abre Conferencia.jsx.
5. Efêmero: baseado em sessionStorage.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
