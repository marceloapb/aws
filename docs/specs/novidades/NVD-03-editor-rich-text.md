# NVD-03 — Editor Rich Text (Frontend)

**TIPO:** Feature  
**PRIORIDADE:** P1  
**IMPACTO:** Alto — experiência de escrita do admin  
**ESFORÇO:** Médio  

## CONTEXTO

O ADM escreve posts usando um editor rich text (TipTap) que produz HTML serializado. O editor suporta: headings, bold/italic, listas, links, imagens inline (via upload NVD-02) e blockquotes. Output salvo no campo `corpo_html` via PUT do NVD-01.

## ESCOPO

- `src/pages/admin/NovidadesEditor.jsx` — componente do editor
- `src/components/editor/TipTapEditor.jsx` — wrapper do TipTap
- Dependências: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`

## FORA DE ESCOPO (NÃO TOCAR)

- Backend (NVD-01/02 já prontos)
- Listagem pública (NVD-04)
- Qualquer outro módulo/página

## SPEC TÉCNICA

**Editor TipTap — extensões:**
- StarterKit (headings h2/h3, bold, italic, bulletList, orderedList, blockquote, code)
- Image (inline, com upload via NVD-02)
- Link (com modal para URL, target _blank)
- Placeholder ("Comece a escrever...")

**Toolbar:**
| Ação | Ícone (lucide-react) |
|------|---------------------|
| H2 | Heading2 |
| H3 | Heading3 |
| Bold | Bold |
| Italic | Italic |
| Lista | List |
| Lista numerada | ListOrdered |
| Blockquote | Quote |
| Link | Link |
| Imagem | Image |

**Fluxo de inserção de imagem:**
1. ADM clica no ícone Imagem.
2. File picker abre.
3. Frontend chama `POST /admin/novidades/imagens/upload` (NVD-02).
4. Recebe `upload_url` → faz PUT no S3.
5. Após sucesso, insere no editor: `<img src="${CDN_BASE_URL}/1/novidades/{post_id}/{img_id}/web.jpg" />`.
6. Placeholder de loading enquanto upload processa.

**Salvamento:**
- Auto-save a cada 30s (debounce) via PUT `/admin/novidades/{id}` com `corpo_html` + `resumo`.
- Indicador visual: "Salvo" / "Salvando..." / "Erro ao salvar".
- Botão "Publicar" muda status para `publicado`.

**Capa:**
- Campo separado acima do editor: upload de imagem de capa (usa mesmo endpoint NVD-02 com `tipo: capa`).
- Preview da capa no topo.

**Padrão visual:** conforme REFERENCIA-LAYOUT-PROTOTIPOS.md — fundo branco, toolbar `border-b border-stone-200`, ACCENT `#EA580C` nos botões ativos.

## CRITÉRIOS DE ACEITE

1. Editor renderiza e produz HTML válido.
2. Toolbar funcional com todas as ações listadas.
3. Inserção de imagem via upload funciona end-to-end.
4. Auto-save a cada 30s com feedback visual.
5. Botão Publicar muda status.
6. Campo de capa com preview.
7. Mobile-friendly (toolbar responsiva).

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente o editor rich text para Novidades conforme spec NVD-03. Crie src/pages/admin/NovidadesEditor.jsx e src/components/editor/TipTapEditor.jsx. Use @tiptap/react com StarterKit + extension-image + extension-link. Toolbar com H2, H3, Bold, Italic, List, ListOrdered, Quote, Link, Image (lucide-react icons). Inserção de imagem chama POST /admin/novidades/imagens/upload, faz PUT no S3, insere <img> com URL do CDN. Auto-save debounce 30s via PUT /admin/novidades/{id}. Indicador Salvo/Salvando/Erro. Botão Publicar muda status. Campo de capa separado com preview. Padrão visual: ACCENT=#EA580C, toolbar border-stone-200. ALTERE SOMENTE os arquivos listados; não refatore, renomeie ou mexa em mais nada.
```
