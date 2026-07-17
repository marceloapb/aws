# IMP-01: Seletor Multi-Entidade + Templates CSV

## Metadados
- **ID:** IMP-01
- **Tipo:** Melhoria
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
O ImportCSV.jsx atual provavelmente suporta apenas 1-2 tipos de importação. A spec §30 prevê suporte a todas as entidades cadastrais. O admin não tem como saber o formato correto do CSV sem um template para download.

## Escopo
- `apps/frontend/src/pages/admin/ImportCSV.jsx` — refatorar header com seletor
- `apps/frontend/src/utils/importTemplates.js` — NOVO, definições de templates
- `apps/frontend/src/assets/templates/` — NOVO, pasta com CSVs de exemplo

## Fora de Escopo (NÃO TOCAR)
- Backend de processamento
- Validação (IMP-03)
- Preview (IMP-02)
- Lógica de upload ao S3

## Spec Técnica

### Entidades Suportadas
| Entidade | Colunas obrigatórias | Colunas opcionais |
|---|---|---|
| Clientes | nome, email, telefone | cpf, endereco, data_nascimento, instagram, notas |
| Sessões/Eventos | titulo, tipo, data, hora_inicio | hora_fim, local, cliente_email, valor, status |
| Equipamentos | nome, categoria, numero_serie | marca, modelo, valor_compra, data_compra, status |
| Catálogo (Pacotes) | nome, tipo, valor | descricao, itens_inclusos, horas_cobertura |
| Pagamentos | cliente_email, valor, data_vencimento | parcela, forma_pagamento, status, orcamento_id |

### Frontend — ImportCSV.jsx (refatorado)
```jsx
// Step 1: Seletor de entidade
<select value={entidade} onChange={setEntidade}>
  <option value="">Selecione o que deseja importar...</option>
  <option value="clientes">Clientes</option>
  <option value="sessoes">Sessões/Eventos</option>
  <option value="equipamentos">Equipamentos</option>
  <option value="catalogo">Catálogo (Pacotes)</option>
  <option value="pagamentos">Pagamentos</option>
</select>

// Step 2: Após selecionar, mostrar:
// - Botão "📥 Baixar template CSV" (gera CSV com headers corretos)
// - Descrição das colunas (tooltip ou tabela)
// - Dropzone para upload do CSV preenchido
```

### Templates (importTemplates.js)
```js
export const IMPORT_TEMPLATES = {
  clientes: {
    label: 'Clientes',
    icon: 'Users',
    headers: ['nome', 'email', 'telefone', 'cpf', 'endereco', 'data_nascimento', 'instagram', 'notas'],
    required: ['nome', 'email', 'telefone'],
    example: [
      ['Maria Silva', 'maria@email.com', '(11) 99999-0000', '123.456.789-00', 'Rua X, 123', '1990-01-15', '@mariasilva', 'Cliente VIP']
    ]
  },
  sessoes: { ... },
  equipamentos: { ... },
  catalogo: { ... },
  pagamentos: { ... }
}
```

### Download do Template
```js
function downloadTemplate(entidade) {
  const { headers, example } = IMPORT_TEMPLATES[entidade]
  const csv = [headers.join(','), ...example.map(row => row.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  // trigger download
}
```

## Critérios de Aceite
- [ ] Seletor de entidade com 5 opções funciona
- [ ] Ao selecionar entidade, botão "Baixar template" aparece
- [ ] Template baixado contém headers corretos + 1 linha de exemplo
- [ ] Descrição de colunas obrigatórias vs opcionais visível
- [ ] Dropzone de upload só ativa após selecionar entidade
- [ ] Se nenhuma entidade selecionada, mostra mensagem orientativa

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IMP-01: Seletor Multi-Entidade + Templates CSV.

1. Crie apps/frontend/src/utils/importTemplates.js com IMPORT_TEMPLATES contendo definição de 5 entidades (clientes, sessoes, equipamentos, catalogo, pagamentos), cada uma com: label, icon, headers[], required[], example[][].

2. Refatore ImportCSV.jsx:
   - Step 1: Select de entidade no topo da página
   - Após seleção: card com descrição da entidade + tabela de colunas (obrigatória/opcional)
   - Botão "📥 Baixar template CSV" que gera e baixa o arquivo
   - Dropzone de upload só habilitado após selecionar entidade
   - Mantenha o restante do fluxo existente intacto

3. Função downloadTemplate(entidade) que monta CSV com headers + example e força download no browser.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
