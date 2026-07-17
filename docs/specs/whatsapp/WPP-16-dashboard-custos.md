# WPP-16: Dashboard de Custos WhatsApp

## Metadados
- **ID:** WPP-16
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Médio
- **Dependência:** WPP-08

## Contexto
Tela de monitoramento de gastos com WhatsApp. Exibe custos por categoria (utility vs marketing), projeção mensal, e alerta se aproximar de limites. Baseado nos dados de LOG_WPP.

## Escopo
- `apps/backend/src/handlers/whatsapp/custos.js` — NOVO
- `apps/frontend/src/pages/admin/WhatsAppCustos.jsx` — NOVO
- API: GET /admin/whatsapp/custos

## Fora de Escopo (NÃO TOCAR)
- Log de envios (WPP-08 — fonte dos dados)
- Financeiro geral (FIN-*)
- Configuração de limites (futuro)

## Spec Técnica

### API — GET /admin/whatsapp/custos
Query params: `mes` (YYYY-MM, default: mês atual)

```json
{
  "mes": "2026-07",
  "resumo": {
    "total_mensagens": 156,
    "custo_total": 4.81,
    "custo_utility": 1.23,
    "custo_marketing": 3.58,
    "mensagens_gratis": 89,
    "mensagens_cobradas": 67
  },
  "projecao_mensal": {
    "mensagens_estimadas": 280,
    "custo_estimado": 8.65
  },
  "por_dia": [
    { "data": "2026-07-01", "mensagens": 8, "custo": 0.24 },
    { "data": "2026-07-02", "mensagens": 12, "custo": 0.37 }
  ],
  "por_template": [
    { "template": "orcamento_enviado", "categoria": "utility", "envios": 45, "custo": 0.92 },
    { "template": "follow_up_generico", "categoria": "marketing", "envios": 23, "custo": 1.84 }
  ],
  "comparativo": {
    "mes_anterior": { "custo": 3.20, "mensagens": 120 },
    "variacao_percentual": 50.3
  }
}
```

### Cálculo de Custo (Brasil, jul/2026)
| Categoria | Dentro Janela | Fora Janela |
|---|---|---|
| utility | R$ 0,00 | R$ 0,0308 |
| marketing | R$ 0,0500 | R$ 0,0800 |
| service (texto livre) | R$ 0,00 | N/A |

### Projeção Mensal
```js
function projetarMes(custoAteDia, diaAtual, diasNoMes) {
  const mediaDiaria = custoAteDia / diaAtual
  return mediaDiaria * diasNoMes
}
```

### Frontend — WhatsAppCustos.jsx
- **Cards Resumo:**
  - Custo Total do Mês (R$)
  - Mensagens Enviadas
  - Mensagens Grátis vs Cobradas
  - Projeção Mensal
- **Gráfico de barras:** Custo por dia (últimos 30 dias)
- **Gráfico de pizza:** Utility vs Marketing
- **Tabela:** Custo por template (ordenado por gasto)
- **Comparativo:** vs mês anterior (↑↓ %)
- **Seletor de mês:** navegar entre meses

### Alertas (futuro, mas preparar estrutura)
- Se projeção > R$ 20/mês: aviso amarelo
- Se projeção > R$ 50/mês: aviso vermelho
- Configurável pelo admin

## Critérios de Aceite
- [ ] Custo total do mês calculado
- [ ] Separação utility vs marketing
- [ ] Mensagens grátis vs cobradas
- [ ] Projeção mensal
- [ ] Custo por dia
- [ ] Custo por template
- [ ] Comparativo com mês anterior
- [ ] Seletor de mês
- [ ] Cards resumo

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-16: Dashboard de Custos WhatsApp.

1. Crie handlers/whatsapp/custos.js: agregar LOG_WPP por mês/dia/template.
2. Crie pages/admin/WhatsAppCustos.jsx: cards, gráficos, tabela.
3. Projeção mensal: média diária × dias no mês.
4. Separar utility vs marketing.
5. Comparativo com mês anterior.
6. SAM: rota GET /admin/whatsapp/custos.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
