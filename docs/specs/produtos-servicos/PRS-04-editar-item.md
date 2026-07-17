# PRS-04: Editar Item

## Metadados
- **ID:** PRS-04
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Crítico
- **Esforço:** Baixo
- **Dependência:** PRS-02

## Contexto
O admin edita itens existentes: corrige nome, ajusta valor, muda categoria, atualiza descrição. O tipo NÃO pode ser alterado após criação (quebra referências). Alteração de valor NÃO afeta orçamentos existentes (congelamento).

## Escopo
- `apps/backend/src/handlers/produtos/itens.js` — ALTERAR (PUT)
- `apps/frontend/src/pages/admin/ItemForm.jsx` — ALTERAR (modo edição)
- API: PUT /admin/produtos/itens/:id

## Fora de Escopo (NÃO TOCAR)
- Criar item (PRS-02)
- Orçamentos existentes (valores congelados)
- Pacotes

## Spec Técnica

### API — PUT /admin/produtos/itens/:id
```json
// Input (campos editáveis)
{
  "nome": "Cobertura Casamento Premium",
  "categoria_id": "cat_001",
  "descricao": "Cobertura completa com 2 fotógrafos",
  "valor_base": 4500.00,
  "duracao_base": 10,
  "valor_hora_adicional": 300.00,
  "exibir_ao_cliente": true
}
```

### Regras
- **Tipo NÃO editável** (campo disabled no form)
- Nome: validar unicidade (excluindo o próprio item)
- Categoria: deve ser ativa
- Valor: pode mudar (não afeta orçamentos existentes — congelamento)
- Ao alterar valor: aviso "Orçamentos existentes não serão afetados"
- Se item está em pacotes: aviso "Este item faz parte de X pacotes"
- Atualizar GSI1/GSI2 se nome ou categoria mudou

### Frontend — ItemForm.jsx (modo edição)
- Mesmo formulário de criação
- Campo tipo desabilitado (readonly)
- Pré-populado com dados atuais
- Aviso se valor mudou: "Orçamentos existentes mantêm o valor anterior"
- Aviso se em pacotes: badge "Usado em X pacotes"
- Botão "Salvar Alterações"

## Critérios de Aceite
- [ ] Edição de todos os campos (exceto tipo)
- [ ] Tipo não editável
- [ ] Validação nome único
- [ ] Aviso de valor ao alterar preço
- [ ] Aviso de pacotes
- [ ] GSIs atualizados
- [ ] Congelamento: orçamentos antigos não afetados

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-04: Editar Item.

1. Em handlers/produtos/itens.js: PUT /admin/produtos/itens/{id}.
2. Em ItemForm.jsx: modo edição, tipo readonly, avisos.
3. Tipo NÃO editável.
4. Validar nome único (excluindo próprio).
5. Atualizar GSI1/GSI2 se nome ou categoria mudou.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
