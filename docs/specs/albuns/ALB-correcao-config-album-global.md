# Correção — Entidade CONFIG_ALBUM_GLOBAL (formalização)

## Problema
O MODELO-DE-DADOS.md menciona "Configuração global de prorrogação" como texto descritivo, sem entidade formal. ALB-10, ALB-11 e ALB-18 dependem dela.

## Entidade a adicionar no MODELO-DE-DADOS.md

```
CONFIG_ALBUM_GLOBAL                                   [§11, atualização 05/07/2026]
  tenant_id                        PK
  prazo_padrao_dias                number (default 180)
  presets_prazo                    number[] (ex: [30, 60, 90, 180, 365])
  dias_antecedencia_aviso          number[] (ex: [7, 3, 1])
  canais_aviso                     string[] (ex: ["whatsapp", "email"])
  templates_whatsapp               map { chave: texto_com_variaveis }
  faixas_extensao                  array of { meses: number, ativo: bool, valor: decimal }
  exibicao_bloquear_visualizacao   bool
  exibicao_bloquear_download       bool
  mensagem_album_expirado          string
```

## DynamoDB (single-table)
- PK = `TENANT#{tenant_id}`, SK = `CONFIG#ALBUM`
- Acesso: GetItem direto (sem GSI)

## Quem consome
- ALB-10 (expiração) → `prazo_padrao_dias`, `dias_antecedencia_aviso`, `canais_aviso`
- ALB-11 (prorrogação config) → `faixas_extensao`, `templates_whatsapp`
- ALB-16 (lifecycle) → `prazo_padrao_dias` (para pré-preencher `expira_em` na pré-geração)
- ALB-18 (tela expirado) → `faixas_extensao`, `mensagem_album_expirado`

## Prompt para o Kiro

```
No arquivo MODELO-DE-DADOS.md, adicione a entidade CONFIG_ALBUM_GLOBAL conforme
definido nesta spec. PK = TENANT#{tenant_id}, SK = CONFIG#ALBUM.
Não altere nenhuma outra entidade. Não renomeie ou mova outros arquivos.
```
