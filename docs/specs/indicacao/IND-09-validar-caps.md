# IND-09 — Validar Suposição Cap A / Cap B

**ID:** IND-09  
**TIPO:** Correção  
**PRIORIDADE:** P0  
**IMPACTO:** Alto | **ESFORÇO:** Zero (decisão do PO)  

---

## Contexto

A spec termina com: *"Suposição explícita a validar: a resposta 'existe para os 2' foi interpretada como dois tetos independentes (Cap A sobre o % de indicação + Cap B do orçamento). Corrigir aqui se o sentido era outro."*. Se a interpretação estiver errada, toda a lógica de grampo muda.

---

## Escopo

- `docs/specs/SPEC-54 -programa-indicacoes.md` (remover a nota e confirmar ou corrigir)

## Fora de Escopo (NÃO TOCAR)

- Código — é decisão documentária.

---

## Spec Técnica

### Duas interpretações possíveis

| Interpretação | Cap A | Cap B | Comportamento |
|---|---|---|---|
| **A (atual)** — Dois tetos independentes | Teto do % acumulado por indicações (ex: 20%) | Teto do desconto total de qualquer orçamento (ex: 30%) | Indicação trava em 20%; orçamento total trava em 30% |
| **B (alternativa)** — Um teto único | N/A | Teto único = desconto máximo do orçamento | Indicação não tem teto próprio, só o grampo do orçamento limita |

### Impacto se for B

Sem Cap A, um indicador poderia acumular 100% e o único limite seria o Cap B no orçamento. Menos previsível, mais risco.

### Ação necessária

PO deve confirmar: **"São 2 tetos independentes (A e B) como descrito, correto?"**
- Se SIM → remover a nota do fim da spec, está validado.
- Se NÃO → reescrever seção 7 (regras de negócio) e ajustar config/entidades.

---

## Critérios de Aceite

1. Nota de suposição removida da spec.
2. Interpretação confirmada pelo PO registrada como decisão.

---

## Prompt para o Kiro

```
No arquivo `docs/specs/SPEC-54 -programa-indicacoes.md`, remova o parágrafo final em
itálico que começa com "Suposição explícita a validar..." e substitua por:
"**Decisão validada (PO, <data>):** Os dois tetos são independentes — Cap A limita o
acumulado de indicações; Cap B limita o total de descontos no orçamento."
Altere SOMENTE esta linha final.
```
