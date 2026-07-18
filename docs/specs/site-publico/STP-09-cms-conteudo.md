# STP-09 — CMS de Conteúdo

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | STP-09 |
| **Tipo** | Feature |
| **Prioridade** | P2 |
| **Impacto** | Médio — elimina deploy para trocar texto/imagem |
| **Esforço** | Médio |

## Contexto
CMS leve que edita texto e imagem das páginas Home, Sobre e Contato sem precisar de deploy. Não edita layout/estrutura — só conteúdo dentro dos blocos. Portfólio e Novidades ficam fora (já têm CMS próprio nas specs PTF e NVD).

## Escopo
- **Frontend (admin):** tela `CmsEditor.jsx` no painel admin, com seletor de página
- **Lambda:** `getPaginaInstitucional` e `putPaginaInstitucional`
- **API Gateway:** `GET /admin/paginas/:tipo` e `PUT /admin/paginas/:tipo`
- **DynamoDB:** entidade `PaginaInstitucional` (PK: `TENANT#<id>`, SK: `PAGE#<tipo>`)
- **Edita:** título, parágrafos, frase de efeito, imagem de capa/fundo (upload → S3)
- **NÃO edita:** layout, estrutura de seções, ordem de blocos

## Fora de Escopo (NÃO TOCAR)
- Portfólio (§15 tem admin próprio)
- Novidades (NVD tem editor rico próprio)
- Telefone/e-mail/WhatsApp (editáveis em Configurações §9, não aqui)
- Layout/CSS do site público
- Depoimentos (gerenciados em Feedback §12)

## Spec Técnica

### DynamoDB
```
PK: TENANT#1  SK: PAGE#home
{
  tipo: "home",
  blocos: [
    { key: "hero_titulo", type: "text", value: "Marcelo Bloise" },
    { key: "hero_frase", type: "text", value: "Fotografia autoral..." },
    { key: "hero_imagem", type: "image", value: "https://cdn.../hero.jpg" },
    { key: "manifesto", type: "richtext", value: "<p>Texto...</p>" },
    { key: "cta_texto", type: "text", value: "Vamos criar juntos?" }
  ],
  updated_at: "2026-07-18T00:00:00Z",
  updated_by: "admin"
}
```

### Lambda putPaginaInstitucional
- Auth: Cognito admin
- Valida: tipo ∈ [home, sobre, contato], blocos é array válido
- Cada bloco: key (string obrigatória), type ∈ [text, richtext, image], value (string)
- Image: se value é base64, faz upload para S3 e substitui por URL; se já é URL, mantém
- Retorna 200 + página atualizada

### Tela Admin (CmsEditor)
```
- Seletor: Home | Sobre | Contato
- Formulário dinâmico por bloco:
  - text → input simples
  - richtext → textarea com formatação básica
  - image → preview + botão trocar (upload)
- Botão "Salvar" → PUT /admin/paginas/:tipo
- Preview: link "Ver no site" abre a página pública em nova aba
```

## Critérios de Aceite
- Admin edita texto de qualquer bloco e salva sem deploy
- Upload de imagem substitui a anterior (S3), URL atualiza no banco
- Página pública reflete a mudança após cache expirar (max 5min)
- Tentativa de editar campo que não existe no schema → rejeitada
- Portfólio/Novidades não aparecem no seletor do CMS

## Prompt Pronto para o Kiro CLI
```
Implemente a spec STP-09 (CMS de Conteúdo do site institucional).

Crie:
1. src/functions/site/getPaginaInstitucional/index.mjs — GET por tipo (home/sobre/contato)
2. src/functions/site/putPaginaInstitucional/index.mjs — PUT com validação + upload S3
3. Rotas GET /admin/paginas/:tipo e PUT /admin/paginas/:tipo no template.yaml
4. src/pages/admin/CmsEditor.jsx — seletor de página, formulário dinâmico por bloco, upload de imagem

DynamoDB: PK TENANT#1, SK PAGE#<tipo>, campo blocos[].
Upload: base64 → S3 → URL. Tipos de bloco: text, richtext, image.
Auth: Cognito admin obrigatório no PUT.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
