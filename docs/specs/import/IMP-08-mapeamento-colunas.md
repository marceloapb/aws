# IMP-08: Mapeamento de Colunas Flexível

## Metadados
- **ID:** IMP-08
- **Tipo:** Feature
- **Prioridade:** P3
- **Impacto:** Baixo
- **Esforço:** Alto
- **Dependência:** IMP-02

## Contexto
Atualmente o CSV precisa ter headers exatamente como o template. Se o admin exportou de outro sistema com colunas nomeadas diferente (ex: "Nome Completo" em vez de "nome"), a importação falha. Um step de mapeamento permite associar colunas do CSV a campos do sistema.

## Escopo
- `apps/frontend/src/components/import/ImportColumnMapper.jsx` — NOVO
- `apps/frontend/src/pages/admin/ImportCSV.jsx` — inserir step de mapeamento
- `apps/frontend/src/utils/columnMatcher.js` — NOVO, auto-match

## Fora de Escopo (NÃO TOCAR)
- Validação (IMP-03)
- Parser (IMP-02)
- Backend
- Salvar mapeamentos para reuso (futuro)

## Spec Técnica

### Fluxo Atualizado
1. Seleciona entidade (IMP-01)
2. Upload CSV (IMP-02 parse)
3. **NOVO → Mapeamento de colunas (IMP-08)**
4. Preview com dados mapeados (IMP-02)
5. Validação (IMP-03)
6. ...

### Frontend — ImportColumnMapper.jsx
- Layout: duas colunas lado a lado
  - Esquerda: "Colunas do seu CSV" (headers detectados)
  - Direita: "Campos do sistema" (da definição da entidade)
- Cada campo do sistema tem um dropdown com as colunas do CSV
- Auto-match inicial:
  - Match exato: "email" → "email"
  - Match parcial: "Nome Completo" → "nome" (fuzzy)
  - Match por sinônimos: "fone" → "telefone"
- Campos obrigatórios marcados com asterisco
- Validação: todos os obrigatórios devem estar mapeados para prosseguir
- Botão: "Confirmar mapeamento →"

### columnMatcher.js
```js
const SYNONYMS = {
  nome: ['name', 'nome completo', 'nome_completo', 'full_name'],
  email: ['e-mail', 'email_address', 'correio'],
  telefone: ['phone', 'tel', 'fone', 'celular', 'whatsapp'],
  cpf: ['documento', 'doc', 'cpf_cnpj'],
  data_nascimento: ['nascimento', 'birthday', 'dt_nascimento'],
}

export function autoMatch(csvHeaders, entityFields) {
  // Para cada entityField, encontrar melhor match nos csvHeaders
  // Retorna: { [entityField]: csvHeader | null }
}
```

### Após Mapeamento
- Reordenar/renomear dados do CSV conforme mapeamento
- Passar dados normalizados para o preview (IMP-02)

## Critérios de Aceite
- [ ] Step de mapeamento aparece entre upload e preview
- [ ] Auto-match funciona para nomes exatos
- [ ] Auto-match funciona para sinônimos comuns
- [ ] Campos não-mapeados mostram dropdown para seleção manual
- [ ] Campos obrigatórios não mapeados bloqueiam prosseguimento
- [ ] Botão "Confirmar" só ativo se obrigatórios mapeados
- [ ] Preview recebe dados já renomeados conforme mapeamento
- [ ] Se headers do CSV são iguais ao template, auto-match 100% e step é pulável

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IMP-08: Mapeamento de Colunas Flexível.

1. Crie apps/frontend/src/utils/columnMatcher.js:
   - SYNONYMS dict com variações para cada campo
   - export autoMatch(csvHeaders, entityFields) → mapping object
   - Match por: exato, lowercase, includes, sinônimos

2. Crie apps/frontend/src/components/import/ImportColumnMapper.jsx:
   - Props: { csvHeaders, entityFields, requiredFields, onConfirm }
   - Layout duas colunas: campos do sistema (esquerda) + dropdown com opções do CSV (direita)
   - Auto-preencher com autoMatch()
   - Asterisco nos obrigatórios
   - Botão "Confirmar" desabilitado se obrigatórios sem match
   - onConfirm(mapping) passa o mapeamento para cima

3. Em ImportCSV.jsx:
   - Inserir step "mapeamento" entre parse e preview
   - Se autoMatch resolve 100% dos obrigatórios: mostrar step como "confirmação rápida"
   - Aplicar mapping nos dados antes de passar para preview

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
