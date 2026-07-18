# SAT-05: Curadoria de Depoimentos (Dupla Trava)

## Metadados
- **ID:** SAT-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** SAT-04

## Contexto
Para um feedback aparecer publicamente como depoimento, precisa de DUPLA TRAVA: (1) cliente autorizou exibição pública + (2) admin marcou como depoimento. LGPD compliant.

## Escopo
- `apps/backend/src/handlers/satisfacao/curadoria.js` — NOVO
- `apps/frontend/src/pages/admin/Depoimentos.jsx` — NOVO
- API: PUT /admin/feedbacks/:id/depoimento, GET /admin/depoimentos

## Fora de Escopo (NÃO TOCAR)
- Tela cliente (SAT-03)
- Exibição pública no site (SAT-09)
- Painel geral (SAT-04)

## Spec Técnica

### Dupla Trava
```
Depoimento público = autoriza_publico (cliente) AND marcado_depoimento (admin)
```

### API — PUT /admin/feedbacks/:id/depoimento
```json
// Input
{
  "marcado_depoimento": true,
  "destaque": false,
  "ordem_exibicao": 3
}

// Response
{
  "id": "fb_001",
  "depoimento_aprovado": true,
  "nome_exibicao": "Ana C.",
  "tipo_evento": "Casamento",
  "estrelas": 5,
  "comentario": "Fotos incríveis!"
}
```

### API — GET /admin/depoimentos
```json
{
  "items": [
    {
      "id": "fb_001",
      "nome_exibicao": "Ana C.",
      "tipo_evento": "Casamento",
      "estrelas": 5,
      "comentario": "Fotos incríveis!",
      "destaque": true,
      "ordem_exibicao": 1,
      "ativo": true
    }
  ],
  "total_aprovados": 12,
  "total_destaque": 3
}
```

### Frontend — Depoimentos.jsx
- **Lista dos aprovados:** Drag-and-drop para reordenar
- **Toggle:** Ativo/Inativo (remover do site sem excluir)
- **Destaque:** Marcar até 3 como destaque (aparecem primeiro)
- **Preview:** Como vai aparecer no site
- **Candidatos:** Lista de feedbacks com autoriza_publico=true que ainda não foram marcados

### Fluxo de Curadoria
```
1. Cliente responde feedback com autoriza_publico=true
2. Admin vê na lista de "Candidatos"
3. Admin marca como depoimento
4. depoimento_aprovado = true (ambas travas OK)
5. Aparece na lista de depoimentos e no site público (SAT-09)
```

### Regras
- Máximo de depoimentos ativos: configurável (default 20)
- Se cliente revogar autorização: depoimento é desativado automaticamente
- Admin pode desativar sem deletar
- Ordem de exibição editável (drag-and-drop)
- Destaques: máximo 3

## Critérios de Aceite
- [ ] Dupla trava funciona (cliente + admin)
- [ ] Marcar/desmarcar depoimento
- [ ] Lista de candidatos
- [ ] Drag-and-drop para reordenar
- [ ] Toggle ativo/inativo
- [ ] Máximo 3 destaques
- [ ] Preview de exibição

## Prompt Pronto para o Kiro CLI

```
Implemente a spec SAT-05: Curadoria de Depoimentos.

1. Crie handlers/satisfacao/curadoria.js: marcar/desmarcar, listar aprovados.
2. Crie pages/admin/Depoimentos.jsx: lista com drag-and-drop.
3. Dupla trava: autoriza_publico + marcado_depoimento.
4. Toggle ativo/inativo, destaque (max 3).
5. Lista de candidatos.
6. SAM: rotas PUT + GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
