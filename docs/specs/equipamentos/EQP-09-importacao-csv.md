# EQP-09: Importação em Lote (CSV)

## Metadados
- **ID:** EQP-09
- **Tipo:** Melhoria
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** EQP-03

## Contexto
Fotógrafos com muitos equipamentos querem importar o inventário inteiro de uma vez via CSV, sem cadastrar um a um.

## Escopo
- `apps/backend/src/handlers/equipamento/importar.js` — NOVO
- `apps/frontend/src/components/equipamento/ImportarEquipamentos.jsx` — NOVO
- API: POST /admin/equipamentos/importar
- Template CSV para download

## Fora de Escopo (NÃO TOCAR)
- CRUD unitário (EQP-03)
- Módulo Import CSV genérico (IMP-*)
- Outros módulos

## Spec Técnica

### Template CSV
```csv
nome,categoria,marca,modelo,num_serie,status,localizacao,padrao,obs
Canon EOS R5,Câmeras,Canon,EOS R5,012345,disponivel,Estúdio A,sim,"Comprada 2024"
Sigma 35mm f/1.4,Lentes,Sigma,35mm Art,067890,disponivel,Mochila,não,""
```

### Fluxo
```
1. Admin baixa template CSV
2. Preenche com seus equipamentos
3. Upload do CSV
4. Backend valida:
   a. Colunas obrigatórias presentes
   b. Categorias existem (ou cria automaticamente)
   c. Num_serie não duplicado
   d. Status válido
5. Preview: tabela com validações (verde=ok, vermelho=erro)
6. Admin confirma importação
7. Backend importa em batch (BatchWriteItem)
8. Resumo: X importados, Y erros, Z ignorados
```

### Validações
| Campo | Regra |
|---|---|
| nome | Obrigatório, max 100 |
| categoria | Obrigatório, cria se não existe |
| marca | Opcional, max 50 |
| modelo | Opcional, max 50 |
| num_serie | Opcional, único se informado |
| status | disponivel/em_uso/manutencao/indisponivel |
| padrao | sim/não (default: não) |

### Backend — importar.js
- Parsear CSV (papaparse ou similar)
- Validar linha a linha
- Auto-criar categorias novas
- BatchWriteItem (25 itens por batch)
- Retornar resumo com erros detalhados

### Frontend — ImportarEquipamentos.jsx
- Botão "Importar CSV" na listagem
- Modal com:
  - Link para download do template
  - Upload do CSV (drag & drop ou file picker)
  - Preview com validação visual
  - Botão "Importar X itens válidos"
  - Ignorar linhas com erro (ou corrigir inline)
- Resultado: resumo com contagem

### Limites
- Max 500 equipamentos por importação
- Max 1MB de arquivo CSV

## Critérios de Aceite
- [ ] Template CSV disponível para download
- [ ] Upload e parse do CSV funciona
- [ ] Validação linha a linha
- [ ] Preview com indicação de erros
- [ ] Auto-criar categorias novas
- [ ] Num_serie único verificado
- [ ] Importação em batch funciona
- [ ] Resumo com contagem (sucesso/erro)
- [ ] Max 500 itens / 1MB respeitado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec EQP-09: Importação em Lote (CSV).

1. Crie handlers/equipamento/importar.js: parse CSV, validar, batch write.
2. Crie components/equipamento/ImportarEquipamentos.jsx: modal com upload, preview, importar.
3. Template CSV para download.
4. Auto-criar categorias novas.
5. BatchWriteItem (25 por batch), max 500 itens.
6. SAM: rota POST /admin/equipamentos/importar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
