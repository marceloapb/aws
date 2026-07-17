# CT-10: CRUD Aditivo de Contrato

## Metadados
- **ID:** CT-10
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CT-05

## Contexto
Após o contrato ser assinado, pode haver necessidade de alterar escopo/valor (ex: incluir drone, mudar data, reduzir serviço). O admin cria um aditivo que é enviado ao cliente para aceite. Tipos: aumento, redução, alteração de data, alteração de escopo.

## Escopo
- `apps/backend/src/handlers/contratos/aditivos.js` — NOVO
- `apps/frontend/src/pages/admin/ContratoAditivos.jsx` — NOVO
- `apps/frontend/src/pages/admin/AditivoForm.jsx` — NOVO
- API: /admin/contratos/:contratoId/aditivos (CRUD)

## Fora de Escopo (NÃO TOCAR)
- Aceite do aditivo (CT-11)
- Recálculo financeiro (CT-12)
- Contrato original (CT-01 a CT-06)

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/contratos/:id/aditivos | Listar aditivos do contrato |
| GET | /admin/contratos/:id/aditivos/:aditivoId | Buscar aditivo |
| POST | /admin/contratos/:id/aditivos | Criar aditivo |
| PUT | /admin/contratos/:id/aditivos/:aditivoId | Atualizar (se pendente) |
| DELETE | /admin/contratos/:id/aditivos/:aditivoId | Cancelar aditivo |

### Criar Aditivo
```json
// Input
{
  "tipo": "aumento",
  "motivo": "Adição de drone na cobertura",
  "descricao_alteracao": "Incluída cobertura com drone (2h de voo) + edição de vídeo aéreo",
  "valor_novo": 5200,
  "itens_adicionados": [
    { "descricao": "Drone 2h", "valor": 500 },
    { "descricao": "Edição vídeo aéreo", "valor": 200 }
  ],
  "itens_removidos": [],
  "nova_data_evento": null,
  "observacoes": "Cliente solicitou após visita ao local"
}

// Response
{
  "id": "adit_001",
  "contrato_id": "ct_001",
  "tipo": "aumento",
  "status": "pendente",
  "valor_original": 4500,
  "valor_novo": 5200,
  "diferenca": 700,
  "link_cliente": "https://app.mbfotos.com.br/aditivo/adit_001?token=xxx",
  "created_at": "2026-08-01T10:00:00Z"
}
```

### Tipos de Aditivo
| Tipo | Descrição | Impacto Financeiro |
|---|---|---|
| aumento | Adicionar serviços/aumentar valor | valor_novo > valor_original |
| reducao | Remover serviços/reduzir valor | valor_novo < valor_original |
| data | Alterar data do evento | Pode ter taxa de remarcação |
| escopo | Alterar escopo sem mudar valor | valor_novo = valor_original |

### Frontend — AditivoForm.jsx
- Tipo de aditivo (select)
- Motivo (textarea)
- Descrição da alteração
- Valor novo (auto-calculado se adicionar/remover itens)
- Itens adicionados (repeater: descrição + valor)
- Itens removidos (select dos itens do contrato)
- Nova data evento (se tipo='data')
- Preview: comparativo antes/depois
- Botão "Enviar para aceite do cliente"

### Frontend — ContratoAditivos.jsx (lista)
- Timeline de aditivos do contrato
- Cards: tipo, valor, status, data
- Badges: 🟡 Pendente, 🟢 Aceito, 🔴 Recusado, ⚫ Cancelado

### Regras
- Só criar aditivo se contrato está 'assinado'
- Admin pode editar aditivo enquanto status='pendente'
- Admin pode cancelar aditivo a qualquer momento
- Gerar link do cliente (mesmo padrão CT-04)
- Emitir evento 'aditivo.criado'

## Critérios de Aceite
- [ ] CRUD de aditivos funciona
- [ ] Tipos: aumento, redução, data, escopo
- [ ] Cálculo automático da diferença
- [ ] Link gerado para o cliente
- [ ] Só permite se contrato assinado
- [ ] Timeline de aditivos
- [ ] Preview antes/depois
- [ ] Evento 'aditivo.criado' emitido

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-10: CRUD Aditivo de Contrato.

1. Crie handlers/contratos/aditivos.js: CRUD completo.
2. Crie pages/admin/ContratoAditivos.jsx: timeline de aditivos.
3. Crie pages/admin/AditivoForm.jsx: form com itens add/remove.
4. Tipos: aumento, redução, data, escopo.
5. Calcular diferença (valor_novo - valor_original).
6. Gerar link do cliente.
7. SAM: rotas CRUD.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
