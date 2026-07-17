# CLI-10: Exportar Clientes (CSV/Excel)

## Metadados
- **ID:** CLI-10
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Baixo
- **Esforço:** Baixo
- **Dependência:** CLI-05

## Contexto
O admin precisa exportar a base de clientes para: backup manual, enviar para contador, usar em ferramenta de email marketing, ou análise offline.

## Escopo
- `apps/frontend/src/pages/admin/Clientes.jsx` — botão exportar
- Backend: Lambda `exportarClientes` — gerar CSV/Excel
- API: GET /admin/clientes/export?format=csv|xlsx

## Fora de Escopo (NÃO TOCAR)
- Import (módulo IMP separado)
- ClienteForm.jsx
- ClienteDetalhe.jsx
- LGPD (consentimento — futuro)

## Spec Técnica

### Frontend — Clientes.jsx
- Botão "⬇️ Exportar" no header da listagem
- Dropdown: CSV, Excel
- Exporta com os filtros ativos (se houver)
- Loading state durante geração
- Download automático do arquivo

### Backend — exportarClientes
- Aceita mesmos filtros da listagem
- Gera arquivo em memória (Lambdas têm 512MB /tmp)
- Para CSV: usar papaparse ou manual
- Para XLSX: usar xlsx (sheetjs)
- Upload para S3 temp (presigned URL, expira em 5 min)
- Retorna URL para download

### Colunas do Export
| Coluna | Campo |
|---|---|
| Nome | nome |
| Email | email |
| Telefone | telefone |
| WhatsApp | whatsapp |
| CPF/CNPJ | cpf_cnpj |
| Status | status |
| Origem | como_conheceu |
| Tags | tags (separadas por ;) |
| Cidade | endereco.cidade |
| Estado | endereco.estado |
| Data Cadastro | created_at |

### Limites
- Máximo 10.000 registros por export
- Se mais: retornar erro com sugestão de filtrar

## Critérios de Aceite
- [ ] Botão exportar com dropdown CSV/Excel
- [ ] Exporta com filtros ativos
- [ ] Download automático funciona
- [ ] CSV com encoding UTF-8 BOM (para Excel abrir correto)
- [ ] Excel com header bold
- [ ] Limite 10k com mensagem de erro
- [ ] Loading durante geração
- [ ] URL expira em 5 minutos

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-10: Exportar Clientes.

1. Em Clientes.jsx: botão "Exportar" com dropdown CSV/Excel.
2. Backend GET /admin/clientes/export?format=csv|xlsx:
   - Aceitar filtros da listagem
   - Gerar arquivo em /tmp
   - Upload S3 temp, presigned URL (5 min)
3. Colunas: nome, email, telefone, whatsapp, cpf_cnpj, status, origem, tags, cidade, estado, data_cadastro.
4. Limite 10k registros.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
