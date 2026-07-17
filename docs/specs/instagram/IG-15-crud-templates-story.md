# IG-15: CRUD Templates de Story (Admin)

## Metadados
- **ID:** IG-15
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** IG-02

## Contexto
O admin cria e gerencia templates de story reutilizáveis. Cada template define: prompt base para a IA, estilo visual, paleta de cores, posição de texto. Usado em IG-11.

## Escopo
- `apps/backend/src/handlers/instagram/templatesStory.js` — NOVO
- `apps/frontend/src/pages/admin/InstagramTemplatesStory.jsx` — NOVO
- `apps/frontend/src/pages/admin/TemplateStoryForm.jsx` — NOVO
- API: /admin/instagram/templates-story (CRUD)

## Fora de Escopo (NÃO TOCAR)
- Stories publicação (IG-11)
- Adapter IA (IG-13/14)
- Templates WhatsApp (WPP-03)

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/instagram/templates-story | Listar |
| GET | /admin/instagram/templates-story/:id | Buscar |
| POST | /admin/instagram/templates-story | Criar |
| PUT | /admin/instagram/templates-story/:id | Atualizar |
| DELETE | /admin/instagram/templates-story/:id | Deletar |

### Criar Template
```json
// Input
{
  "nome": "Casamento Elegante",
  "descricao": "Story com foto do casal + texto overlay elegante",
  "prompt_base": "Crie um story elegante para casamento. Use a foto do casal como fundo com overlay escuro sutil. Texto em fonte serifada dourada. Incluir nomes do casal e data.",
  "estilo": "elegante",
  "paleta_cores": ["#FFFFFF", "#D4AF37", "#1A1A1A"],
  "posicao_texto": "bottom",
  "incluir_logo": true,
  "categoria": "casamento"
}

// Response
{
  "id": "stpl_001",
  "nome": "Casamento Elegante",
  "status": "ativo",
  "created_at": "2026-07-17T10:00:00Z"
}
```

### Templates Pré-configurados (Seed)
| Template | Estilo | Categoria | Prompt |
|---|---|---|---|
| Casamento Elegante | elegante | casamento | Fundo escuro, texto dourado serifado |
| Ensaio Clean | minimalista | ensaio | Fundo branco, texto preto sem serifa |
| Aniversário Fun | colorido | aniversario | Cores vibrantes, confetti, texto bold |
| Corporativo | profissional | corporativo | Sóbrio, azul/cinza, logo destaque |
| Natal/Festivo | festivo | promocao | Vermelho/verde/dourado, flocos |

### Frontend — InstagramTemplatesStory.jsx
- Lista de templates com: nome, categoria, estilo, status (ativo/inativo)
- Preview visual (miniatura do estilo)
- Filtro por categoria
- Toggle ativo/inativo

### Frontend — TemplateStoryForm.jsx
- Nome, descrição
- Prompt base (textarea com dicas)
- Estilo (select)
- Paleta de cores (color pickers)
- Posição texto (top/center/bottom)
- Incluir logo (toggle)
- Categoria (select)
- Preview simulado

## Critérios de Aceite
- [ ] CRUD de templates funciona
- [ ] Campos: nome, prompt_base, estilo, paleta, posição
- [ ] Listagem com filtro por categoria
- [ ] Toggle ativo/inativo
- [ ] Templates seed criados
- [ ] Preview no form
- [ ] Validação de campos obrigatórios

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-15: CRUD Templates de Story.

1. Crie handlers/instagram/templatesStory.js: CRUD completo.
2. Crie pages/admin/InstagramTemplatesStory.jsx: listagem + filtros.
3. Crie pages/admin/TemplateStoryForm.jsx: formulário com preview.
4. Entidade TEMPLATE_STORY_IG no DynamoDB.
5. Templates seed (5 pré-configurados).
6. SAM: rotas CRUD.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
