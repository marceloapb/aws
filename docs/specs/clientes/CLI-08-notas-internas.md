# CLI-08: Notas Internas por Cliente

## Metadados
- **ID:** CLI-08
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** CLI-01

## Contexto
O admin precisa registrar anotações sobre cada cliente (preferências, detalhes de conversa, observações internas). Essas notas NÃO são visíveis ao cliente — são exclusivas do admin.

## Escopo
- `apps/frontend/src/pages/admin/ClienteDetalhe.jsx` — seção notas
- `apps/frontend/src/components/cliente/NotasCliente.jsx` — NOVO
- Backend: Lambda CRUD notas
- DynamoDB: entidade NOTA (PK: TENANT#id, SK: NOTA#cliente_id#timestamp)

## Fora de Escopo (NÃO TOCAR)
- Timeline (CLI-04 — notas aparecerão lá automaticamente)
- ClienteForm.jsx
- Clientes.jsx
- Portal do cliente

## Spec Técnica

### Modelo de Dados — NOTA
```json
{
  "PK": "TENANT#t123",
  "SK": "NOTA#cli_001#2026-07-17T10:00:00Z",
  "GSI1PK": "CLIENTE#cli_001",
  "GSI1SK": "NOTA#2026-07-17T10:00:00Z",
  "conteudo": "Cliente prefere fotos em estilo clean. Gosta de luz natural.",
  "autor": "admin@studio.com",
  "created_at": "2026-07-17T10:00:00Z",
  "updated_at": "2026-07-17T10:00:00Z"
}
```

### Frontend — NotasCliente.jsx
- Lista de notas ordenadas por data DESC
- Textarea para nova nota (placeholder: "Adicionar observação...")
- Botão "Salvar nota"
- Cada nota: conteúdo, autor, data relativa
- Editar/Excluir nota (soft delete)
- Máximo 2000 caracteres por nota

### API
- GET /admin/clientes/:id/notas
- POST /admin/clientes/:id/notas
- PUT /admin/clientes/:id/notas/:nota_id
- DELETE /admin/clientes/:id/notas/:nota_id

## Critérios de Aceite
- [ ] Adicionar nota funciona
- [ ] Listar notas ordenadas por data DESC
- [ ] Editar nota existente
- [ ] Excluir nota (com confirmação)
- [ ] Max 2000 caracteres com contador
- [ ] Autor e data exibidos
- [ ] Nota NÃO visível no portal do cliente

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-08: Notas Internas por Cliente.

1. Crie components/cliente/NotasCliente.jsx: lista, textarea, CRUD.
2. Em ClienteDetalhe.jsx: integrar NotasCliente.
3. Backend CRUD: GET/POST/PUT/DELETE /admin/clientes/:id/notas.
4. DynamoDB: entidade NOTA com GSI1 por cliente.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
