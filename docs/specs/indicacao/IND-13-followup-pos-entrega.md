# IND-13 — Integração Follow-up §20 (Régua Pós-Entrega)

**ID:** IND-13  
**TIPO:** Feature  
**PRIORIDADE:** P3  
**IMPACTO:** Médio | **ESFORÇO:** Médio  

---

## Contexto

O momento de maior satisfação é após a entrega do álbum. É o ponto ideal pra incentivar indicação. O motor de follow-up (§20) pode disparar uma mensagem com o link de indicação do cliente.

---

## Escopo

- Config de follow-up (novo template)
- `src/handlers/followup/processarFollowup.mjs` (adicionar resolução de url_indicacao)

## Fora de Escopo (NÃO TOCAR)

- Motor de follow-up em si (já existe).
- Lógica de entrega de álbum.
- Handlers de indicação (apenas consumir o código existente).

---

## Spec Técnica

### Novo evento no follow-up

- Trigger: `AlbumEntregue` (já existe no sistema, §21).
- Delay: +3 dias após entrega.
- Template de mensagem WhatsApp:

> "Oi {{nome}}! Esperamos que tenha amado as fotos 📸. Sabia que você pode ganhar desconto indicando amigos? Seu link exclusivo: {{url_indicacao}}. A cada amigo que fechar, seu desconto cresce!"

### Implementação

1. Novo item de configuração de follow-up:

```json
{
  "PK": "TENANT#<tid>",
  "SK": "FOLLOWUP#TEMPLATE#pos_entrega_indicacao",
  "evento_gatilho": "AlbumEntregue",
  "delay_dias": 3,
  "canal": "whatsapp",
  "template": "Oi {{nome}}! Esperamos que tenha amado as fotos 📸. Sabia que você pode ganhar desconto indicando amigos? Seu link exclusivo: {{url_indicacao}}. A cada amigo que fechar, seu desconto cresce!",
  "ativo": true,
  "condicao": "programa_indicacoes_ativo AND cliente_tem_codigo"
}
```

2. O motor de follow-up (já existente) processa o template, substitui variáveis (nome, url_indicacao), e despacha via fila de notificações.

3. O handler de follow-up precisa resolver `url_indicacao`: Query PK=`CLIENTE#<id>`, SK begins_with `REFCODE` → monta URL. Se não tem código, gera automaticamente.

---

## Critérios de Aceite

1. 3 dias após entrega, cliente recebe WhatsApp com link de indicação.
2. Se programa desligado, mensagem não é enviada.
3. Se cliente não tem código, gera um automaticamente antes de enviar.
4. Template configurável pelo ADM nas configurações de follow-up.

---

## Prompt para o Kiro

```
1) Adicione seed de follow-up template na configuração: item DynamoDB com
PK=TENANT#default, SK=FOLLOWUP#TEMPLATE#pos_entrega_indicacao, com
evento_gatilho=AlbumEntregue, delay_dias=3, canal=whatsapp, template com
placeholders {{nome}} e {{url_indicacao}}.
2) No processador de follow-up existente (`src/handlers/followup/processarFollowup.mjs`),
adicione lógica para resolver {{url_indicacao}}: buscar código do cliente, gerar se não
existir (reuse da lógica de getMeuCodigo), montar URL.
3) Condicionar envio a programa_indicacoes ativo.
Altere SOMENTE o processador de follow-up e adicione o seed no script de seed/migration.
```
