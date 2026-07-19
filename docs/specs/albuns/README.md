# §11 — Álbuns e Galerias (Specs de Implementação)

> Specs atômicas para o módulo de álbuns. Cada uma contém prompt pronto para o Kiro CLI.

## Estrutura

| Spec | Título | Prioridade | Status |
|------|--------|------------|--------|
| ALB-01 | Modelo de dados | P0 | ⚠️ Revisar (alinhar com MODELO-DE-DADOS.md) |
| ALB-02 | Upload presigned URL | P0 | ✅ OK |
| ALB-03 | Processamento de versões | P0 | ✅ OK |
| ALB-04 | Trava 70% | P0 | ✅ OK (arquivo: `ALB-04-trava-70-porcento.md`) |
| ALB-05 | CRUD de galerias | P1 | ✅ OK |
| ALB-06 | Organização de fotos | P1 | ✅ OK |
| ALB-07 | Publicação do álbum | P1 | ✅ OK |
| ALB-08 | Seleção pelo cliente | P1 | ✅ OK |
| ALB-09 | Download / controle | P1 | ✅ OK |
| ALB-10 | Expiração do álbum | P1 | ⚠️ Revisar (usar CONFIG_ALBUM_GLOBAL) |
| ALB-11 | Prorrogação config ADM | P1 | ⚠️ Revisar (usar CONFIG_ALBUM_GLOBAL) |
| ALB-12 | Lightbox / visualizador | P2 | ✅ OK |
| ALB-13 | Watermark automático | P3 | ❌ BACKLOG (sem fonte de verdade) |
| ALB-14 | Comentários em fotos | P2 | ⚠️ Aguarda PO |
| ALB-15 | Estatísticas do álbum | P3 | ❌ BACKLOG (sem fonte de verdade) |
| **ALB-16** | **Lifecycle / Máquina de Estados** | **P0** | 🆕 |
| **ALB-17** | **Tema e Personalização da Vitrine** | **P1** | 🆕 |
| **ALB-18** | **Tela Álbum Expirado (cliente)** | **P1** | 🆕 |

## Correções aplicadas

- **Removido:** `ALB-04-trava-70.md` (duplicata menor, 3.0KB)
- **Adicionado:** `ALB-correcao-config-album-global.md` (entidade formal)
- **BACKLOG:** `BACKLOG-P3-watermark.md`, `BACKLOG-P3-estatisticas.md`

## Dependências entre specs

```
ALB-16 (Lifecycle) ← base de tudo
  ├── ALB-04 (Trava 70%) ← pré-requisito de publicação
  ├── ALB-17 (Tema) ← default na pré-geração
  └── ALB-18 (Prorrogação) ← transição expirado→entregue
       └── ALB-10/11 (Config global) ← faixas e preços
            └── CONFIG_ALBUM_GLOBAL (entidade formal)
```

## Ordem de Execução

| Fase | Specs | Dependência |
|------|-------|-------------|
| 1 — Fundação | ALB-16 (Lifecycle) | Nenhuma |
| 2 — Paralelo | ALB-17 (Tema), ALB-18 (Prorrogação) | ALB-16 |
| 3 — Cleanup | Remover duplicata, mover backlog | — |
