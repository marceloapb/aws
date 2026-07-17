# ORC-07: Itens de Evento por Opção

## Metadados
- **ID:** ORC-07
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** ORC-01

## Contexto
Cada opção do orçamento pode ter N eventos (Ensaio + Cerimônia + Recepção). Cada evento tem tipo, data, horários, local completo com CEP.

## Escopo
- `apps/frontend/src/components/orcamento/EventoBuilder.jsx` — NOVO
- `apps/frontend/src/pages/admin/OrcamentoForm.jsx` — integrar
- Backend: validação de eventos

## Fora de Escopo (NÃO TOCAR)
- Agenda (AGD-*)
- Check de conflito (ORC-05)
- Reserva (ORC-06)

## Spec Técnica

### Modelo de Dados — Evento
```json
{
  "evento_id": "evt_001",
  "tipo": "casamento",
  "nome": "Cerimônia + Recepção",
  "data": "2026-11-15",
  "hora_inicio": "14:00",
  "hora_fim": "22:00",
  "local": {
    "nome": "Espaço Villa Garden",
    "endereco": "Rua das Flores, 123",
    "bairro": "Jardim Europa",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01234-567"
  },
  "observacoes": "Chegar 1h antes"
}
```

### Tipos de Evento
ensaio, casamento, aniversario, corporativo, batizado, formatura, newborn, making_of, pre_wedding, trash_the_dress, outro

### Frontend — EventoBuilder.jsx
- Card por evento: tipo, nome, data, hora_inicio/fim, local (com busca CEP), observações
- Botões: + Adicionar (max 10), Remover
- Mínimo 1 evento por opção
- Busca CEP via viaCEP

## Critérios de Aceite
- [ ] 1 a 10 eventos por opção
- [ ] Busca de CEP auto-preenche
- [ ] Hora fim > hora início
- [ ] Data não pode ser passado
- [ ] Mínimo 1 evento obrigatório

## Prompt Pronto para o Kiro CLI

```
Implemente a spec ORC-07: Itens de Evento por Opção.

1. Crie EventoBuilder.jsx com campos completos e busca CEP.
2. Em OrcamentoForm.jsx: renderizar dentro de cada opção.
3. Backend: validar eventos[] (min 1, formato data/hora).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
