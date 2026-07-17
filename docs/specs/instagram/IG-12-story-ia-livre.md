# IG-12: Stories com IA — Modo IA Livre

## Metadados
- **ID:** IG-12
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Alto
- **Dependência:** IG-13, IG-14

## Contexto
Em vez de usar template, o admin descreve em texto livre o que quer no story e a IA gera a composição completa (texto + arte). Maior flexibilidade, menor previsibilidade.

## Escopo
- `apps/backend/src/handlers/instagram/storyIALivre.js` — NOVO
- `apps/frontend/src/pages/admin/InstagramStoryLivre.jsx` — NOVO
- API: POST /admin/instagram/stories/ia-livre

## Fora de Escopo (NÃO TOCAR)
- Modo template (IG-11)
- Adapter LLM (IG-13 — já existe)
- Publicação feed (IG-03)

## Spec Técnica

### API — POST /admin/instagram/stories/ia-livre
```json
// Input
{
  "prompt": "Story para divulgar ensaio pré-wedding da Ana e Pedro no parque, estilo clean e elegante, tons dourados",
  "foto_s3_key": "albuns/alb_001/foto_001.jpg",
  "estilo": "elegante",
  "incluir_logo": true,
  "cliente_id": "cli_001"
}

// Response
{
  "story_id": "story_002",
  "preview_url": "https://...",
  "texto_gerado": "Ana & Pedro | Pré-Wedding 💍",
  "status": "preview",
  "custo_ia": 0.06
}
```

### Fluxo
```
1. Admin escreve prompt livre + seleciona foto (opcional)
2. LLM (IG-13) interpreta prompt e gera:
   - Texto overlay
   - Sugestão de composição
   - Paleta de cores
3. Gerador de arte (IG-14) cria imagem 1080x1920
4. Retornar PREVIEW (não publica automaticamente)
5. Admin aprova ou ajusta prompt
6. Se aprovado: publicar como Story
7. Registrar custos
```

### Interação LLM
```js
const systemPrompt = `
Você é um designer de stories para Instagram de um fotógrafo profissional.
Gere uma composição para story 1080x1920 com:
- Texto overlay (máx 3 linhas, impactante)
- Posição do texto (top/center/bottom)
- Estilo visual (cores, fonte sugerida)
- Se há foto de fundo: como integrar
Responda em JSON.
`

const userPrompt = input.prompt + (input.estilo ? `\nEstilo: ${input.estilo}` : '')
```

### Regras
- SEMPRE mostrar preview antes de publicar
- Max 3 gerações por story (evitar custo excessivo)
- Se admin não aprovar: salvar como rascunho
- Registrar CUSTO_IA_IG para cada chamada LLM + arte
- Fallback: se geração falha, sugerir modo template

## Critérios de Aceite
- [ ] Prompt livre aceito
- [ ] LLM gera composição em JSON
- [ ] Arte gerada 1080x1920
- [ ] Preview obrigatório
- [ ] Max 3 tentativas por story
- [ ] Custo registrado
- [ ] Publicar após aprovação
- [ ] Fallback para template se IA falha

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-12: Stories com IA — Modo Livre.

1. Crie handlers/instagram/storyIALivre.js: prompt → LLM → arte → preview.
2. Crie pages/admin/InstagramStoryLivre.jsx: input prompt, preview, aprovar.
3. Max 3 gerações por story.
4. Preview obrigatório antes de publicar.
5. Registrar CUSTO_IA_IG.
6. Fallback: sugerir template se falhar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
