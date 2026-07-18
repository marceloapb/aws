# MID-05 — Presigned URL de Leitura (Privado)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | MID-05 |
| **Tipo** | Feature |
| **Prioridade** | P1 |
| **Impacto** | Alto — entrega de fotos do álbum ao cliente |
| **Esforço** | Baixo |

## Contexto
Fotos de álbum ficam no bucket privado. Para o cliente visualizar ou baixar, precisa de presigned GET URL com TTL curto (15min). Lambda gera sob demanda, validando ownership (evento pertence ao cliente) e regras de trava (download bloqueado se não pagou 70%).

## Escopo
- **Lambda:** `getMediaUrl` — gera presigned GET para uma ou mais fotos
- **API Gateway:** `POST /cliente/media/urls` (batch) + `GET /cliente/media/:id/url` (single)
- **Validações:** ownership (evento do cliente), status da mídia, trava de download
- **TTL:** 15min para visualização, 60min para download de alta

## Fora de Escopo (NÃO TOCAR)
- Mídia pública (MID-06, CloudFront)
- Lógica da trava 70% (módulo Pagamento, aqui só consulta flag)
- Upload (MID-02)
- Processamento (MID-03)

## Spec Técnica

### Lambda getMediaUrl
- Auth: JWT cliente
- Valida: mídia pertence ao evento do cliente (query DynamoDB)
- Modos:
  1. **Visualização** (web/thumb): sempre liberado se álbum disponível
  2. **Download** (original): só se `download_liberado = true`

### Request (batch)
```json
{
  "media_ids": ["01JABC", "01JDEF", "01JGHI"],
  "versao": "web"
}
```

### Response
```json
{
  "urls": [
    { "media_id": "01JABC", "url": "https://...", "expires_in": 900 },
    { "media_id": "01JDEF", "url": "https://...", "expires_in": 900 }
  ]
}
```

### Regras
- `versao=original` e download bloqueado → 403 para esses itens específicos
- `versao=web/thumb` → sempre gera (visualização liberada)
- Batch máx 50 itens por request
- TTL: web/thumb = 15min, original = 60min

### Presigned Config
```javascript
const command = new GetObjectCommand({ Bucket, Key });
const url = await getSignedUrl(s3Client, command, { expiresIn: ttl });
```

## Critérios de Aceite
- Presigned URL funcional (GET retorna a imagem)
- URL expira após TTL (403 depois)
- Download de original bloqueado retorna 403 + mensagem (sem mencionar trava)
- Visualização (web/thumb) SEMPRE funciona se álbum disponível
- Batch de 50 retorna em <2s
- Mídia de outro cliente → 403

## Prompt Pronto para o Kiro CLI
```
Implemente a spec MID-05 (Presigned URL de Leitura — mídia privada).

Crie:
1. src/functions/media/getMediaUrl/index.mjs — gera presigned GET (single + batch)
2. Rotas POST /cliente/media/urls e GET /cliente/media/:id/url no template.yaml
3. IAM role com s3:GetObject no bucket privado (path restrito por tenant)

Valida ownership. TTL: web/thumb 15min, original 60min.
Download original: checa flag download_liberado (403 se bloqueado).
Batch: máx 50. Mensagem amigável no 403.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
