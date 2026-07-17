# CLI-04: Timeline de Interações no Detalhe do Cliente

## Metadados
- **ID:** CLI-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Alto
- **Dependência:** CLI-02, CLI-05

## Contexto
O `ClienteDetalhe.jsx` (9KB) mostra dados estáticos. Falta uma timeline com todo o histórico do relacionamento: orçamentos, contratos, sessões, pagamentos, notas, mudanças de status. Isso é o coração do CRM.

## Escopo
- `apps/frontend/src/pages/admin/ClienteDetalhe.jsx` — timeline component
- `apps/frontend/src/components/cliente/Timeline.jsx` — NOVO
- Backend: Lambda `getClienteTimeline` — agregar eventos
- API: GET /admin/clientes/:id/timeline

## Fora de Escopo (NÃO TOCAR)
- `ClienteForm.jsx`
- `Clientes.jsx`
- Módulos origem (orçamentos, contratos, agenda)

## Spec Técnica

### Tipos de Evento na Timeline
| Tipo | Ícone | Cor | Fonte |
|---|---|---|---|
| orcamento_criado | 📋 | Azul | Orçamentos |
| orcamento_aceito | ✅ | Verde | Orçamentos |
| orcamento_recusado | ❌ | Vermelho | Orçamentos |
| contrato_gerado | 📄 | Roxo | Contratos |
| contrato_assinado | ✍️ | Verde | Contratos |
| sessao_realizada | 📷 | Laranja | Agenda |
| pagamento_recebido | 💰 | Verde | Financeiro |
| pagamento_atrasado | ⚠️ | Vermelho | Financeiro |
| status_alterado | 🔄 | Cinza | Pipeline |
| nota_adicionada | 📝 | Amarelo | Notas |
| album_entregue | 🖼️ | Azul | Álbuns |

### Backend — getClienteTimeline
- Query: buscar todos os registros do cliente (PK=TENANT#id, SK begins_with CLIENTE#id)
- Agregar: orçamentos, contratos, sessões, pagamentos
- Ordenar por timestamp DESC
- Paginação: cursor-based (último timestamp)
- Limit: 20 por página

### Frontend — Timeline.jsx
- Lista vertical com linha conectora
- Ícone + cor por tipo
- Timestamp relativo ("há 3 dias")
- Clicável: navega para o recurso (orçamento, contrato etc)
- Filtro por tipo de evento
- Lazy load (scroll infinito)

## Critérios de Aceite
- [ ] Timeline mostra todos os tipos de evento
- [ ] Ordenada por data DESC
- [ ] Ícones e cores corretos por tipo
- [ ] Clique navega para o recurso
- [ ] Filtro por tipo funciona
- [ ] Paginação com scroll infinito
- [ ] Timestamp relativo ("há X dias")
- [ ] Vazio: mensagem "Nenhuma interação registrada"

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-04: Timeline de Interações.

1. Crie components/cliente/Timeline.jsx: lista vertical, ícones, cores, filtro, lazy load.
2. Em ClienteDetalhe.jsx: integrar Timeline abaixo dos dados.
3. Backend GET /admin/clientes/:id/timeline: agregar eventos, paginar por cursor.
4. Query DynamoDB: buscar registros relacionados ao cliente.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
