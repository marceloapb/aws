# SPEC G3

**ID:** G3  
**TIPO:** Feature  
**TÍTULO:** Entidade `TEMA_ALBUM` + CRUD para persistir personalização visual da vitrine  
**PRIORIDADE:** P2  
**IMPACTO:** Médio — sem ela, o editor de tema não tem onde salvar (vitrine não renderiza personalização)  
**ESFORÇO:** Médio (1 entidade + 2 Lambdas)

## CONTEXTO

O arquivo `FUNCIONALIDADES-album-adm.md` seção 3 descreve o editor de tema (cores, layouts, fontes, animações, logo/posição, capa). A spec §11 confirma que a personalização é **por álbum**. Mas nem a spec nem o MODELO-DE-DADOS.md formalizam uma entidade de dados — é um gap de modelo que impede a implementação.

## ESCOPO (arquivos e recursos)

### DynamoDB — nova entidade TEMA_ALBUM (single-table)

```
TEMA_ALBUM (PK: ALBUM#<album_id>, SK: TEMA)
  capa_foto_id: String (nullable)
  capa_modo: String (enum: cover|contain|fill)
  cores: {
    fundo: String (hex),
    texto: String (hex),
    acento: String (hex)
  }
  layout: String (enum: grade|mosaico|colagem|slider|coluna|ladrilhos)
  fonte_titulo: String
  fonte_corpo: String
  animacao: String (enum: none|fade|slide|zoom)
  logo_posicao: String (enum: top-left|top-center|top-right|bottom-left|bottom-center|bottom-right)
  updated_at: String (ISO 8601)
```

### Lambda — `getTemaAlbum`
- GET /admin/album/{albumId}/tema
- Lê TEMA_ALBUM. Se não existir, retorna defaults (layout grade, cores padrão da identidade visual, animação none, logo top-left).

### Lambda — `putTemaAlbum`
- PUT /admin/album/{albumId}/tema
- Body: objeto completo do tema.
- Validação: cores devem ser hex válido (#RRGGBB); layout deve estar no enum; fonte não vazia; animação no enum; logo_posicao no enum.
- Grava com updated_at = now.

### Lambda — `getTemaAlbumPublico` (lado cliente, leitura)
- GET /cliente/album/{albumId}/tema
- Mesmo que getTemaAlbum mas auth = cliente (dono do álbum) ou acesso por slug público.
- Retorna só os campos visuais (sem metadata interna).

### API Gateway — HTTP API
- GET  /admin/album/{albumId}/tema → getTemaAlbum (auth: admin)
- PUT  /admin/album/{albumId}/tema → putTemaAlbum (auth: admin)
- GET  /public/album/{slug}/tema → getTemaAlbumPublico (auth: none, rate-limited)

### IAM
- Role `getTemaAlbumRole`: dynamodb:GetItem, condition PK prefix ALBUM#.
- Role `putTemaAlbumRole`: dynamodb:PutItem, condition PK prefix ALBUM#.
- Role `getTemaAlbumPublicoRole`: dynamodb:GetItem (read-only).

### SAM (template.yaml) — adições
- 3 funções Lambda + roles + rotas.

## FORA DE ESCOPO (NÃO TOCAR)

- Editor visual no frontend (protótipo já existe; consome esta API).
- Renderização da vitrine (consome GET público; lógica de apresentação é frontend).
- Upload de logo (pertence ao serviço de mídia / Configurações §9).
- Entidade ALBUM — nenhuma alteração (capa_foto_id TAMBÉM vive em ALBUM para compatibilidade; TEMA_ALBUM pode sobrescrever visualmente).

## CRITÉRIOS DE ACEITE

1. GET tema de álbum sem tema salvo retorna defaults válidos (200, não 404).
2. PUT com cores inválidas (ex: "vermelho") retorna 400.
3. PUT com layout fora do enum retorna 400.
4. PUT válido persiste; GET subsequente retorna exatamente o que foi salvo.
5. GET público retorna tema sem exigir auth (álbum publicado).
6. GET público em álbum não publicado retorna 404.

## PROMPT PRONTO PARA O KIRO CLI

```
Implemente a spec G3 — Entidade TEMA_ALBUM + CRUD.

Crie:
1. Entidade TEMA_ALBUM no DynamoDB (PK: ALBUM#<album_id>, SK: TEMA) com campos: capa_foto_id, capa_modo (cover|contain|fill), cores ({fundo, texto, acento} hex), layout (grade|mosaico|colagem|slider|coluna|ladrilhos), fonte_titulo, fonte_corpo, animacao (none|fade|slide|zoom), logo_posicao (top-left|top-center|top-right|bottom-left|bottom-center|bottom-right), updated_at.
2. Lambda getTemaAlbum (GET /admin/album/{albumId}/tema) — retorna tema ou defaults.
3. Lambda putTemaAlbum (PUT /admin/album/{albumId}/tema) — valida enums e hex, grava.
4. Lambda getTemaAlbumPublico (GET /public/album/{slug}/tema) — leitura pública, só se álbum publicado.
5. IAM: uma role por Lambda, privilégio mínimo.
6. SAM: adicione ao template.yaml.

Altere SOMENTE: template.yaml, src/handlers/album/getTemaAlbum.mjs, src/handlers/album/putTemaAlbum.mjs, src/handlers/album/getTemaAlbumPublico.mjs, e os arquivos de role IAM. NÃO refatore, renomeie ou mexa em mais nada.
```
