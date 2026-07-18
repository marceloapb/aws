# STP-06 — Página Sobre

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | STP-06 |
| **Tipo** | Feature |
| **Prioridade** | P2 |
| **Impacto** | Médio — humaniza a marca, gera confiança |
| **Esforço** | Baixo |

## Contexto
Página institucional "Sobre" / "A Empresa". Conta a história do fotógrafo, exibe números (anos de experiência, eventos realizados) e foto pessoal. Conteúdo vem de PaginaInstitucional (tipo=sobre).

## Escopo
- **Frontend:** `SobrePage.jsx` dentro do SiteLayout
- **Consome:** `GET /public/paginas/sobre` (retorna blocos da PaginaInstitucional tipo=sobre)
- **Seções:** Foto + Bio → Números/Conquistas → Timeline opcional
- **Conteúdo editável** via CMS (STP-09) — aqui só renderiza

## Fora de Escopo (NÃO TOCAR)
- CMS de edição (STP-09)
- Backend de PaginaInstitucional (STP-01 cria a entidade base)
- Formulário de contato (STP-07)

## Spec Técnica

### Lambda getPageContent (compartilhada com Home/Contato)
- Já existe ou será criada como utility em STP-03
- Recebe `tipo` (home/sobre/contato), retorna `blocos[]`

### Estrutura da Página
```
<SobrePage>
  <HeroSobre>
    - Foto pessoal/profissional (bloco tipo=imagem_principal)
    - Título "Sobre" ou custom
  </HeroSobre>
  <Bio>
    - Texto longo (2-4 parágrafos) — bloco tipo=texto_bio
    - Formatação básica (negrito, itálico)
  </Bio>
  <Numeros>
    - Cards com ícone + número + label
    - Ex: "12+ anos", "500+ eventos", "50.000+ fotos"
    - Dados vêm dos blocos tipo=numero (array)
  </Numeros>
</SobrePage>
```

### Formato do Bloco
```json
{
  "tipo": "sobre",
  "blocos": [
    { "key": "imagem_principal", "value": "https://cdn.../foto.jpg" },
    { "key": "texto_bio", "value": "<p>Texto formatado...</p>" },
    { "key": "numeros", "value": [
      { "icone": "camera", "numero": "12+", "label": "anos" },
      { "icone": "calendar", "numero": "500+", "label": "eventos" }
    ]}
  ]
}
```

## Critérios de Aceite
- Foto pessoal renderiza; ausente → seção sem imagem (não quebra)
- Bio renderiza HTML básico (negrito/itálico)
- Números renderizam como cards; array vazio → seção oculta
- Responsivo: foto+bio lado a lado desktop, empilhados mobile

## Prompt Pronto para o Kiro CLI
```
Implemente a spec STP-06 (Página Sobre do site público).

Crie:
1. src/pages/public/SobrePage.jsx — Hero com foto, bio formatada, cards de números

Consome: GET /public/paginas/sobre (retorna blocos[] de PaginaInstitucional).
Bio: renderiza HTML sanitizado. Números: cards com ícone+número+label.
Layout: foto+bio side-by-side desktop, stacked mobile. Seções sem dados = ocultas.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
