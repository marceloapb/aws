# SPEC G4

**ID:** G4  
**TIPO:** Melhoria  
**TÍTULO:** Expor `percentual_pago` na resposta de listagem de álbuns  
**PRIORIDADE:** P3  
**IMPACTO:** Baixo — UX (admin vê de relance quem pode publicar sem abrir cada álbum)  
**ESFORÇO:** Baixo (enriquecimento de query existente)

## CONTEXTO

O arquivo `FUNCIONALIDADES-album-adm.md` seção 1 menciona: "Lista de álbuns — todos os álbuns do estúdio, com status (rascunho/publicado) e o **% pago visível**". A spec §11 define a trava dos 70% mas não detalha explicitamente que o % aparece na listagem. O campo já existe na camada de Pagamento (§10): `soma(valor_pago) ÷ valor_final`. Basta expô-lo na API de listagem.

## ESCOPO (arquivos e recursos)

### Lambda — `listAlbuns` (EXISTENTE — evolução)

Arquivo: `src/handlers/album/listAlbuns.mjs`

**Alteração:** após buscar os álbuns, para cada álbum com `orcamento_id` não-null:
1. Buscar o valor_final do orçamento (já na tabela, PK ORCAMENTO#<id>).
2. Buscar soma de valor_pago das COBRANCAS vinculadas (GSI por orcamento_id, filtro status=paga).
3. Calcular `percentual_pago = Math.round((soma_pago / valor_final) * 100)`.
4. Se álbum avulso (sem orcamento_id), `percentual_pago = null`.

**Retorno enriquecido** por álbum:
```json
{
  "...campos_existentes": true,
  "percentual_pago": 70,
  "pode_publicar": true
}
```
`pode_publicar` = `percentual_pago >= 70` (ou true se avulso, decisão do admin).

### IAM — evolução da role existente
- Adicionar permissão `dynamodb:Query` no GSI de cobranças (condition SK prefix COBRANCA#).

### Otimização
- Se a listagem tem muitos álbuns, o cálculo N+1 pode ser caro. **Alternativa aceita:** campo `percentual_pago` denormalizado no próprio registro do ALBUM, atualizado pelo webhook de pagamento (event-driven). Implementar a denormalização é OPCIONAL nesta spec; o cálculo em tempo real é o mínimo viável.

## FORA DE ESCOPO (NÃO TOCAR)

- Lógica da trava dos 70% na publicação (já existe ou é spec separada).
- Frontend (a UI do protótipo já mostra a barra de %).
- Módulo Pagamento — nenhuma alteração nas cobranças.
- Criação/exclusão de álbuns.

## CRITÉRIOS DE ACEITE

1. GET /admin/albuns retorna `percentual_pago` numérico (0–100) para álbuns com orçamento.
2. Álbum avulso (sem orcamento_id) retorna `percentual_pago: null` e `pode_publicar: true`.
3. Álbum com 65% pago retorna `pode_publicar: false`.
4. Álbum com 70%+ retorna `pode_publicar: true`.
5. Tempo de resposta da listagem < 500ms para até 50 álbuns.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente a spec G4 — Expor percentual_pago na listagem de álbuns.

Altere src/handlers/album/listAlbuns.mjs:
1. Para cada álbum com orcamento_id não-null, query no GSI de cobranças (filtro status=paga), some valor_pago, divida por valor_final do orçamento, arredonde.
2. Adicione ao response de cada álbum: percentual_pago (Number 0-100 ou null se avulso) e pode_publicar (Boolean: percentual_pago >= 70 ou true se avulso).
3. Atualize a IAM role de listAlbuns para incluir dynamodb:Query no GSI de cobranças.

Altere SOMENTE: src/handlers/album/listAlbuns.mjs e o arquivo de role IAM correspondente no template.yaml. NÃO refatore, renomeie ou mexa em mais nada.
```
