# DICIONÁRIO DE DADOS COMPLETO
# Horizons Photography Management System

---

## Coleção: `agenda`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | Identificador único PocketBase |
| tipo_evento | text | sim | livre | Categoria do evento (Casamento, 15 Anos, etc.) |
| data_evento | date | sim | YYYY-MM-DD | Data do evento no calendário |
| horario_inicio | text | não | HH:mm | Horário de início |
| horario_fim | text | não | HH:mm | Horário de término |
| local_evento | text | não | livre | Endereço ou nome do local |
| observacoes | text | não | livre | Notas adicionais |
| cliente_id | relation | não | → clientes | Vínculo com cliente |
| orcamento_id | relation | não | → orcamentos | Orçamento associado |
| status | select | sim | livre, ocupada, fora | Disponibilidade na agenda |
| origem | select | sim | sistema, google | De onde o evento foi criado |
| sync_status | select | sim | sincronizado, pendente, erro | Estado da sincronização Google Calendar |
| google_event_id | text | não | livre | ID do evento no Google Calendar |
| erro | text | não | livre | Mensagem de erro do último sync |
| aviso_whatsapp_ativo | bool | não | true/false | Habilita lembrete WhatsApp |
| antecedencia_minutos | number | não | inteiro | Minutos antes do evento para enviar lembrete |
| lembrete_enviado | bool | não | true/false | Se o lembrete já foi enviado |
| cor_calendario | text | não | hex color | Cor do evento no Google Calendar |
| fotografo_id | relation | não | → fotografos | Fotógrafo designado |
| created | datetime | auto | ISO | Criação do registro |
| updated | datetime | auto | ISO | Última atualização |

---

## Coleção: `clientes`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| nome | text | sim | livre | Nome completo do cliente |
| email | email | não | RFC 5321 | E-mail de contato |
| telefone | text | não | livre | Telefone fixo ou celular |
| whatsapp_numero | text | não | +55DDNÚMERO | Número WhatsApp com código país |
| cpf | text | não | 000.000.000-00 | CPF formatado |
| data_nascimento | date | não | YYYY-MM-DD | Data de nascimento |
| endereco | text | não | livre | Endereço completo |
| cidade | text | não | livre | Cidade |
| estado | text | não | UF (2 letras) | Estado |
| cep | text | não | 00000-000 | CEP |
| como_conheceu | text | não | livre | Canal de aquisição |
| indicado_por | relation | não | → clientes | Quem indicou |
| user_id | relation | não | → users_cliente | Conta de acesso do cliente |
| observacoes | text | não | livre | Notas sobre o cliente |
| ativo | bool | sim | true/false | Cadastro ativo |
| total_eventos | number | não | inteiro | Contador de eventos |
| valor_total_gasto | number | não | decimal | Total gasto pelo cliente |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `orcamentos`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| numero | text | auto | ORC-XXXXX | Número sequencial gerado |
| cliente_id | relation | sim | → clientes | Cliente dono do orçamento |
| data_evento | date | não | YYYY-MM-DD | Data do evento orçado |
| local_evento | text | não | livre | Local do evento |
| tipo_evento | text | sim | livre | Categoria (Casamento, etc.) |
| valor_total | number | sim | decimal | Valor total do serviço |
| valor_sinal | number | não | decimal | Valor de entrada |
| valor_restante | number | não | decimal | Valor pendente após sinal |
| desconto | number | não | decimal | Desconto aplicado |
| status | select | sim | rascunho, enviado, aprovado, rejeitado, cancelado | Status do orçamento |
| data_validade | date | não | YYYY-MM-DD | Validade da proposta |
| pacote_id | relation | não | → pacotes_comerciais | Pacote vinculado |
| descricao | text | não | livre | Descrição detalhada |
| itens | json | não | [{desc, qtd, valor}] | Itens do orçamento |
| contrato_gerado | bool | não | true/false | Contrato já emitido |
| contrato_id | relation | não | → contratos | Contrato vinculado |
| observacoes_internas | text | não | livre | Notas internas (não visível ao cliente) |
| motivo_rejeicao | text | não | livre | Motivo da rejeição |
| token_publico | text | auto | UUID | Token para acesso público |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `cobracas`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| cliente_id | relation | sim | → clientes | Cliente devedor |
| orcamento_id | relation | não | → orcamentos | Orçamento vinculado |
| contrato_id | relation | não | → contratos | Contrato vinculado |
| album_id | relation | não | → albuns | Álbum vinculado |
| tipo | select | sim | sinal, total, parcela, extensao | Tipo da cobrança |
| valor | number | sim | decimal > 0 | Valor a cobrar |
| descricao | text | sim | livre | Descrição da cobrança |
| status | select | sim | pendente, processando, pago, vencido, cancelado, estornado | Status do pagamento |
| data_vencimento | date | não | YYYY-MM-DD | Data de vencimento |
| data_pagamento | datetime | não | ISO | Data em que o pagamento foi confirmado |
| gateway_provider | text | não | asaas, mercadopago, etc. | Gateway usado |
| gateway_id | text | não | livre | ID do pagamento no gateway |
| link_pagamento | url | não | https | Link de pagamento gerado |
| pix_copia_cola | text | não | livre | Código PIX copia-e-cola |
| pix_qr_code | text | não | base64 | Imagem QR Code em base64 |
| boleto_url | url | não | https | URL do boleto PDF |
| boleto_codigo | text | não | livre | Código de barras do boleto |
| meio_pagamento | select | não | pix, boleto, cartao_credito, cartao_debito, dinheiro, transferencia | Método usado |
| parcelas | number | não | 1-12 | Número de parcelas |
| referencia_externa | text | não | livre | Referência no sistema do gateway |
| dados_brutos | json | não | {} | Resposta bruta do gateway |
| criado_por_admin | relation | não | → users_admin | Quem criou a cobrança |
| cancelado_em | datetime | não | ISO | Data do cancelamento |
| observacoes | text | não | livre | Notas |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `albuns`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| titulo | text | sim | livre | Nome do álbum |
| descricao | text | não | livre | Descrição |
| cliente_id | relation | sim | → clientes | Cliente dono |
| evento_id | relation | não | → agenda | Evento associado |
| status | select | sim | ativo, expirado, em_graca, pronto_exclusao | Status de retenção |
| data_entrega | date | não | YYYY-MM-DD | Data de entrega ao cliente |
| data_expiracao | date | não | YYYY-MM-DD | Data de expiração (30 dias após entrega) |
| senha | text | não | livre | Senha de acesso (hash bcrypt) |
| total_fotos | number | não | inteiro | Contador de fotos |
| tamanho_total_mb | number | não | decimal | Tamanho total em MB |
| s3_prefix | text | auto | albuns/{id}/ | Prefixo no S3 |
| link_compartilhamento | text | auto | UUID | Link público |
| link_expiracao | datetime | não | ISO | Expiração do link |
| plano_anual_id | relation | não | → planos_anuais | Plano de proteção |
| protegido | bool | não | true/false | Se está protegido por plano |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `fotos`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| album_id | relation | sim | → albuns | Álbum pai |
| nome_original | text | sim | livre | Nome original do arquivo |
| s3_key | text | sim | livre | Chave no S3 (full size) |
| s3_key_thumb | text | não | livre | Chave no S3 (thumbnail) |
| url | text | auto | livre | URL pública (CloudFront) |
| url_thumb | text | auto | livre | URL do thumbnail |
| tamanho_bytes | number | sim | inteiro | Tamanho em bytes |
| largura | number | não | inteiro | Largura em pixels |
| altura | number | não | inteiro | Altura em pixels |
| mime_type | text | sim | image/* | Tipo MIME |
| ordem | number | não | inteiro | Ordem no álbum |
| selecionada | bool | não | true/false | Selecionada pelo cliente |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `galerias`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| album_id | relation | sim | → albuns | Álbum pai |
| titulo | text | sim | livre | Nome da galeria |
| descricao | text | não | livre | Descrição |
| max_selecao | number | não | inteiro | Máximo de fotos selecionáveis |
| status | select | sim | aberta, fechada | Status da seleção |
| fotos_selecionadas | json | não | [foto_ids] | IDs das fotos selecionadas |
| data_limite | date | não | YYYY-MM-DD | Prazo para seleção |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `contratos`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| numero | text | auto | CTR-XXXXX | Número sequencial |
| cliente_id | relation | sim | → clientes | Cliente |
| orcamento_id | relation | não | → orcamentos | Orçamento origem |
| titulo | text | sim | livre | Título do contrato |
| conteudo_html | text | sim | HTML | Corpo do contrato |
| status | select | sim | rascunho, enviado, assinado, cancelado | Status |
| token_assinatura | text | auto | UUID | Token para URL pública |
| assinado_em | datetime | não | ISO | Data/hora da assinatura |
| assinatura_ip | text | não | IPv4/IPv6 | IP do assinante |
| assinatura_user_agent | text | não | livre | User-Agent do navegador |
| assinatura_imagem | text | não | base64 | Imagem da assinatura (canvas) |
| assinatura_hash | text | não | SHA-256 | Hash de não-repúdio |
| pdf_s3_key | text | não | livre | Chave do PDF no S3 |
| pdf_url | text | não | livre | URL do PDF |
| enviado_em | datetime | não | ISO | Data de envio |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `google_calendar_config`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| access_token | text | não | livre | Token de acesso OAuth |
| refresh_token | text | não | livre | Token de renovação |
| token_expiry | datetime | não | ISO | Expiração do access_token |
| calendar_id | text | não | livre | ID do calendário selecionado |
| sync_token | text | não | livre | Token de sync incremental |
| watch_channel_id | text | não | livre | ID do canal de push |
| watch_resource_id | text | não | livre | Resource ID do watch |
| watch_expiration | datetime | não | ISO | Expiração do watch |
| connected | bool | sim | true/false | Se está conectado |
| last_sync | datetime | não | ISO | Última sincronização |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `google_calendar_logs`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| tipo | select | sim | sync_full, sync_incremental, push, create, update, delete, error | Tipo de operação |
| direcao | select | sim | local_to_google, google_to_local | Direção do sync |
| evento_id | relation | não | → agenda | Evento relacionado |
| google_event_id | text | não | livre | ID no Google |
| status | select | sim | sucesso, erro | Resultado |
| detalhes | text | não | livre | Detalhes/erro |
| created | datetime | auto | ISO | — |

---

## Coleção: `instagram_publicacoes`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| album_id | relation | não | → albuns | Álbum de origem |
| fotos_ids | json | sim | [foto_ids] | IDs das fotos selecionadas |
| caption | text | não | livre | Legenda do post |
| status | select | sim | agendado, publicando, publicado, erro | Status |
| agendado_para | datetime | não | ISO | Data/hora agendada |
| publicado_em | datetime | não | ISO | Data/hora real da publicação |
| instagram_post_id | text | não | livre | ID do post no Instagram |
| instagram_permalink | text | não | livre | URL permanente do post |
| erro_mensagem | text | não | livre | Mensagem de erro |
| container_ids | json | não | [ids] | IDs dos containers criados |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `equipamentos`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| nome | text | sim | livre | Nome do equipamento |
| categoria | select | sim | camera, lente, flash, tripe, bateria, cartao, outro | Categoria |
| marca | text | não | livre | Marca |
| modelo | text | não | livre | Modelo |
| numero_serie | text | não | livre | Número de série |
| status | select | sim | disponivel, em_uso, manutencao, inativo | Status |
| data_aquisicao | date | não | YYYY-MM-DD | Data de compra |
| valor_aquisicao | number | não | decimal | Valor pago |
| proxima_manutencao | date | não | YYYY-MM-DD | Próxima manutenção |
| observacoes | text | não | livre | Notas |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `fotografos`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| nome | text | sim | livre | Nome completo |
| email | email | não | RFC 5321 | Email |
| telefone | text | não | livre | Telefone |
| especialidade | text | não | livre | Especialidade |
| comissao_percentual | number | não | 0-100 | % de comissão |
| ativo | bool | sim | true/false | Se está ativo |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `pendencias`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| titulo | text | sim | livre | Título da tarefa |
| descricao | text | não | livre | Descrição detalhada |
| prioridade | select | sim | baixa, media, alta, urgente | Prioridade |
| status | select | sim | pendente, em_andamento, concluida, cancelada | Status |
| data_limite | date | não | YYYY-MM-DD | Prazo |
| responsavel_id | relation | não | → fotografos | Responsável |
| evento_id | relation | não | → agenda | Evento relacionado |
| cliente_id | relation | não | → clientes | Cliente relacionado |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `pacotes_comerciais`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| nome | text | sim | livre | Nome do pacote |
| descricao | text | não | livre | Descrição |
| tipo_evento | text | não | livre | Tipo de evento alvo |
| valor | number | sim | decimal | Valor do pacote |
| itens | json | sim | [{desc, qtd}] | Itens inclusos |
| ativo | bool | sim | true/false | Se está disponível |
| ordem | number | não | inteiro | Ordem de exibição |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `depoimentos`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| cliente_id | relation | sim | → clientes | Cliente autor |
| avaliacao_id | relation | não | → avaliacoes | Avaliação de origem |
| texto | text | sim | livre | Texto do depoimento |
| nota | number | sim | 1-10 | Nota dada |
| aprovado | bool | sim | true/false | Se foi aprovado para exibição |
| destaque | bool | não | true/false | Se aparece em destaque |
| evento_tipo | text | não | livre | Tipo do evento |
| data_evento | date | não | YYYY-MM-DD | Data do evento |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `avaliacoes`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| cliente_id | relation | sim | → clientes | Cliente |
| evento_id | relation | não | → agenda | Evento avaliado |
| nota | number | sim | 1-10 | Nota NPS |
| comentario | text | não | livre | Comentário |
| convertido_depoimento | bool | não | true/false | Se virou depoimento |
| enviado_em | datetime | não | ISO | Quando o convite foi enviado |
| respondido_em | datetime | não | ISO | Quando respondeu |
| token | text | auto | UUID | Token para link de avaliação |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `portfolio`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| titulo | text | sim | livre | Título |
| descricao | text | não | livre | Descrição |
| categoria | text | não | livre | Categoria (Casamento, etc.) |
| foto_url | text | sim | URL | URL da foto (S3/CloudFront) |
| foto_s3_key | text | sim | livre | Chave no S3 |
| ordem | number | não | inteiro | Ordem de exibição |
| ativo | bool | sim | true/false | Se está visível |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `configuracoes`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| chave | text | sim | livre | Chave da configuração |
| valor | text | sim | livre | Valor (string, JSON stringified) |
| tipo | select | sim | texto, numero, booleano, json | Tipo do valor |
| descricao | text | não | livre | Descrição da config |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

**Configurações padrão:**
- `empresa_nome` — Nome da empresa
- `empresa_cnpj` — CNPJ
- `empresa_telefone` — Telefone
- `empresa_email` — Email
- `empresa_endereco` — Endereço
- `empresa_logo_url` — URL do logo
- `album_dias_expiracao` — Dias até expirar (default: 30)
- `album_dias_graca` — Dias de graça após expirar (default: 7)
- `gateway_padrao` — Gateway de pagamento padrão
- `whatsapp_ativo` — Se WhatsApp está ativo
- `instagram_ativo` — Se Instagram está ativo
- `google_calendar_ativo` — Se Calendar está ativo

---

## Coleção: `backups`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| tipo | select | sim | automatico, manual | Tipo do backup |
| status | select | sim | em_andamento, concluido, erro | Status |
| arquivo_nome | text | não | livre | Nome do arquivo |
| s3_key | text | não | livre | Chave no S3 |
| tamanho_bytes | number | não | inteiro | Tamanho |
| duracao_ms | number | não | inteiro | Duração em ms |
| erro_mensagem | text | não | livre | Erro se falhou |
| created | datetime | auto | ISO | — |

---

## Coleção: `planos_anuais`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| cliente_id | relation | sim | → clientes | Cliente |
| album_id | relation | sim | → albuns | Álbum protegido |
| valor_anual | number | sim | decimal | Valor do plano |
| data_inicio | date | sim | YYYY-MM-DD | Início da vigência |
| data_fim | date | sim | YYYY-MM-DD | Fim da vigência |
| status | select | sim | ativo, expirado, cancelado | Status |
| renovacao_automatica | bool | não | true/false | Se renova automaticamente |
| cobranca_id | relation | não | → cobracas | Cobrança vinculada |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `novidades`

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| titulo | text | sim | livre | Título da novidade |
| descricao | text | sim | livre | Descrição |
| tipo | select | sim | feature, melhoria, correcao | Tipo |
| versao | text | não | livre | Versão do sistema |
| data_lancamento | date | sim | YYYY-MM-DD | Data |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `users_admin` (auth)

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| email | email | sim | RFC 5321 | Email de login |
| password | text | sim | hash | Senha (gerenciada pelo PB) |
| nome | text | sim | livre | Nome do admin |
| avatar_url | text | não | URL | Avatar |
| role | select | sim | super_admin, admin | Nível de acesso |
| ativo | bool | sim | true/false | Se está ativo |
| ultimo_login | datetime | não | ISO | Último login |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## Coleção: `users_cliente` (auth)

| Campo | Tipo PB | Obrigatório | Valores | Descrição |
|---|---|---|---|---|
| id | text | auto | — | ID único |
| email | email | sim | RFC 5321 | Email de login |
| password | text | não | hash | Senha (opcional, usa código) |
| nome | text | sim | livre | Nome |
| cliente_id | relation | sim | → clientes | Cliente vinculado |
| email_verificado | bool | sim | true/false | Se email foi verificado |
| codigo_verificacao | text | não | 6 dígitos | Código temporário |
| codigo_expiracao | datetime | não | ISO | Expiração do código |
| ultimo_login | datetime | não | ISO | Último login |
| created | datetime | auto | ISO | — |
| updated | datetime | auto | ISO | — |

---

## RELACIONAMENTOS ENTRE COLLECTIONS

```
clientes ─────────┬──→ orcamentos (1:N)
                  ├──→ cobracas (1:N)
                  ├──→ albuns (1:N)
                  ├──→ contratos (1:N)
                  ├──→ avaliacoes (1:N)
                  ├──→ depoimentos (1:N)
                  ├──→ planos_anuais (1:N)
                  └──→ users_cliente (1:1)

orcamentos ───────┬──→ cobracas (1:N)
                  ├──→ contratos (1:1)
                  └──→ agenda (1:1)

albuns ───────────┬──→ fotos (1:N)
                  ├──→ galerias (1:N)
                  ├──→ instagram_publicacoes (1:N)
                  └──→ planos_anuais (1:1)

agenda ───────────┬──→ google_calendar_logs (1:N)
                  └──→ pendencias (1:N)

fotografos ───────┬──→ agenda (1:N)
                  └──→ pendencias (1:N)
```
