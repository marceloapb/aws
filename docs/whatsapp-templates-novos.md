# WhatsApp Templates — Novos (Para Submissão na Meta)

**Conta:** MBFoto (Marcelo Bloise Fotografia)  
**Idioma:** Português (Brasil) — `pt_BR`  
**Data de criação:** 2026-08-03  

## Templates Já Aprovados (referência)

| # | Nome | Status |
|---|------|--------|
| 1 | `album_pronto` | ✅ Aprovado |
| 2 | `contrato_assinado_aviso` | ✅ Aprovado |
| 3 | `contrato_assinatura` | ✅ Aprovado |
| 4 | `evento_confirmado` | ✅ Aprovado |
| 5 | `feedback_solicitacao` | ✅ Aprovado |
| 6 | `lembrete_evento` | ✅ Aprovado |
| 7 | `mbfoto_codigo_verificacao` | ✅ Aprovado |
| 8 | `notificacao_geral` | ✅ Aprovado |
| 9 | `novo_orcamento` | ✅ Aprovado |
| 10 | `orcamento_pronto` | ✅ Aprovado |
| 11 | `pagamento_confirmado` | ✅ Aprovado |
| 12 | `pagamento_vencido` | ✅ Aprovado |

---

## Novos Templates para Submissão

---

### 1. `boas_vindas_cliente`

| Campo | Valor |
|-------|-------|
| **Categoria** | MARKETING |
| **Header** | IMAGE (logo MBFoto ou foto de boas-vindas) |
| **Footer** | MBFoto • Marcelo Bloise Fotografia |
| **Botões** | QUICK_REPLY: `Ver portfólio` · `Falar com Marcelo` |

**Body:**

```
Olá, {{1}}! 👋

Seja muito bem-vindo(a) à MBFoto! Sou Marcelo Bloise e estou muito feliz por você fazer parte da nossa família.

📸 Aqui, cada momento é tratado com dedicação e arte. Estou à disposição para transformar seus momentos em memórias inesquecíveis.

Se tiver qualquer dúvida ou quiser conhecer nosso trabalho, é só me chamar!
```

**Observações de uso:**
- Disparar automaticamente após o primeiro cadastro do cliente na plataforma.
- Variável `{{1}}`: nome do cliente.
- Usar imagem de header com a logo ou uma foto marcante do portfólio.

---

### 2. `album_expirando`

| Campo | Valor |
|-------|-------|
| **Categoria** | UTILITY |
| **Header** | TEXT: `⚠️ Seu álbum está expirando` |
| **Footer** | MBFoto • Marcelo Bloise Fotografia |
| **Botões** | URL: `Acessar álbum` → `{{1}}` |

**Body:**

```
Olá, {{1}}! 📷

Seu álbum "{{2}}" expira em *{{3}} dia(s)*. Após essa data, as fotos não estarão mais disponíveis para download.

🔗 Acesse agora e salve suas fotos antes que o prazo termine.

Caso precise de mais tempo, entre em contato que verificamos as opções disponíveis para você.
```

**Observações de uso:**
- Variável `{{1}}`: nome do cliente.
- Variável `{{2}}`: nome/título do álbum.
- Variável `{{3}}`: número de dias restantes.
- Disparar quando faltar 7 dias, 3 dias e 1 dia para expiração.
- O botão URL deve apontar para o link direto do álbum.

---

### 3. `orcamento_aprovado`

| Campo | Valor |
|-------|-------|
| **Categoria** | UTILITY |
| **Header** | NONE |
| **Footer** | MBFoto • Marcelo Bloise Fotografia |
| **Botões** | QUICK_REPLY: `Ver contrato` · `Falar com Marcelo` |

**Body:**

```
Olá, {{1}}! ✅

Ótima notícia! Seu orçamento para *{{2}}* foi aprovado com sucesso.

💰 Valor: R$ {{3}}
📅 Data do evento: {{4}}

O próximo passo é a assinatura do contrato. Assim que estiver pronto, enviaremos para você.

Obrigado pela confiança! Estou animado para registrar esse momento especial. 🎉
```

**Observações de uso:**
- Variável `{{1}}`: nome do cliente.
- Variável `{{2}}`: tipo de evento/serviço.
- Variável `{{3}}`: valor aprovado.
- Variável `{{4}}`: data do evento.
- Disparar quando o orçamento mudar para status "aprovado" no sistema.

---

### 4. `evento_amanha`

| Campo | Valor |
|-------|-------|
| **Categoria** | UTILITY |
| **Header** | TEXT: `📅 Lembrete: Seu evento é amanhã!` |
| **Footer** | MBFoto • Marcelo Bloise Fotografia |
| **Botões** | QUICK_REPLY: `Confirmar` · `Preciso ajustar algo` |

**Body:**

```
Olá, {{1}}! 🌟

Passando para lembrar que amanhã é o grande dia!

📍 *Evento:* {{2}}
🕐 *Horário:* {{3}}
📌 *Local:* {{4}}

Estarei lá com todo o equipamento pronto para capturar cada momento. Se houver qualquer alteração de última hora, me avise o quanto antes.

Nos vemos amanhã! 📸
```

**Observações de uso:**
- Variável `{{1}}`: nome do cliente.
- Variável `{{2}}`: tipo/nome do evento.
- Variável `{{3}}`: horário do evento.
- Variável `{{4}}`: endereço/local do evento.
- Disparar automaticamente 1 dia antes (manhã, ~9h).
- Complementa o `lembrete_evento` existente (que pode ser usado com mais antecedência).

---

### 5. `fotos_prontas`

| Campo | Valor |
|-------|-------|
| **Categoria** | UTILITY |
| **Header** | IMAGE (preview/capa do ensaio) |
| **Footer** | MBFoto • Marcelo Bloise Fotografia |
| **Botões** | URL: `Ver fotos` → `{{1}}` |

**Body:**

```
Olá, {{1}}! 🎉

Suas fotos estão prontas! ✨

📸 *Evento:* {{2}}
🖼️ *Quantidade:* {{3}} fotos editadas

Cada imagem foi cuidadosamente tratada para que seus momentos fiquem eternizados da melhor forma.

Clique no botão abaixo para acessar e baixar suas fotos. O link ficará disponível por {{4}} dias.

Espero que ame o resultado! 💛
```

**Observações de uso:**
- Variável `{{1}}`: nome do cliente.
- Variável `{{2}}`: nome do evento/ensaio.
- Variável `{{3}}`: quantidade de fotos.
- Variável `{{4}}`: dias de validade do link.
- O botão URL aponta para a galeria/álbum online.
- Usar uma foto de capa do ensaio como header (IMAGE).

---

### 6. `pagamento_lembrete`

| Campo | Valor |
|-------|-------|
| **Categoria** | UTILITY |
| **Header** | NONE |
| **Footer** | MBFoto • Marcelo Bloise Fotografia |
| **Botões** | URL: `Pagar agora` → `{{1}}` |

**Body:**

```
Olá, {{1}}! 👋

Passando para lembrar que você tem um pagamento com vencimento em *{{2}}*.

💳 *Referência:* {{3}}
💰 *Valor:* R$ {{4}}

Para sua comodidade, você pode efetuar o pagamento pelo link abaixo.

Caso já tenha realizado o pagamento, por favor desconsidere esta mensagem. 😊
```

**Observações de uso:**
- Variável `{{1}}`: nome do cliente.
- Variável `{{2}}`: data de vencimento.
- Variável `{{3}}`: descrição/referência do pagamento (ex: "Ensaio Família - Parcela 2/3").
- Variável `{{4}}`: valor.
- Disparar 3 dias antes do vencimento.
- Diferencia-se do `pagamento_vencido` (que é pós-vencimento) por ser preventivo.

---

### 7. `selecao_fotos_pronta`

| Campo | Valor |
|-------|-------|
| **Categoria** | UTILITY |
| **Header** | TEXT: `📷 Seleção de fotos disponível` |
| **Footer** | MBFoto • Marcelo Bloise Fotografia |
| **Botões** | URL: `Fazer seleção` → `{{1}}` |

**Body:**

```
Olá, {{1}}! ✨

As fotos do seu evento *{{2}}* estão disponíveis para seleção!

🖼️ *Total de fotos:* {{3}}
✅ *Você pode selecionar:* {{4}} fotos

Acesse o link abaixo para visualizar e escolher suas favoritas. O prazo para seleção é de *{{5}} dias*.

Se tiver dúvidas sobre o processo, estou à disposição! 📸
```

**Observações de uso:**
- Variável `{{1}}`: nome do cliente.
- Variável `{{2}}`: nome do evento.
- Variável `{{3}}`: total de fotos disponíveis.
- Variável `{{4}}`: quantidade que pode ser selecionada.
- Variável `{{5}}`: prazo em dias para seleção.
- O botão URL aponta para a página de seleção.

---

### 8. `contrato_lembrete`

| Campo | Valor |
|-------|-------|
| **Categoria** | UTILITY |
| **Header** | NONE |
| **Footer** | MBFoto • Marcelo Bloise Fotografia |
| **Botões** | URL: `Assinar contrato` → `{{1}}` · QUICK_REPLY: `Tenho dúvidas` |

**Body:**

```
Olá, {{1}}! 📋

Notei que seu contrato para *{{2}}* ainda não foi assinado.

📅 *Data do evento:* {{3}}
⏳ *Contrato enviado em:* {{4}}

Para garantir que tudo esteja certo para o seu evento, peço que assine o contrato o quanto antes. É rápido e pode ser feito digitalmente pelo link abaixo.

Se tiver alguma dúvida sobre os termos, estou à disposição para esclarecer! 🤝
```

**Observações de uso:**
- Variável `{{1}}`: nome do cliente.
- Variável `{{2}}`: tipo/nome do evento.
- Variável `{{3}}`: data do evento.
- Variável `{{4}}`: data em que o contrato foi enviado.
- Disparar 3 dias após envio do contrato sem assinatura e novamente 7 dias depois.
- Complementa o `contrato_assinatura` (que é o envio inicial).

---

### 9. `album_extensao_disponivel`

| Campo | Valor |
|-------|-------|
| **Categoria** | MARKETING |
| **Header** | NONE |
| **Footer** | MBFoto • Marcelo Bloise Fotografia |
| **Botões** | QUICK_REPLY: `Quero prorrogar` · `Não preciso` |

**Body:**

```
Olá, {{1}}! 📸

Seu álbum "{{2}}" expirou em {{3}}, mas temos uma boa notícia!

🔄 Você pode solicitar uma prorrogação para acessar e baixar suas fotos novamente.

📅 *Extensão disponível por:* {{4}} dias
💰 *Valor:* {{5}}

Seus momentos são preciosos e merecem ser guardados. Se quiser reativar o acesso, é só responder esta mensagem!
```

**Observações de uso:**
- Variável `{{1}}`: nome do cliente.
- Variável `{{2}}`: nome do álbum.
- Variável `{{3}}`: data de expiração.
- Variável `{{4}}`: dias da extensão oferecida.
- Variável `{{5}}`: valor da extensão (pode ser "gratuito" ou "R$ XX").
- Disparar 1-3 dias após expiração do álbum.
- Categoria MARKETING pois envolve oferta/upsell.

---

### 10. `aniversario_cliente`

| Campo | Valor |
|-------|-------|
| **Categoria** | MARKETING |
| **Header** | IMAGE (arte de feliz aniversário com branding MBFoto) |
| **Footer** | MBFoto • Marcelo Bloise Fotografia |
| **Botões** | QUICK_REPLY: `Obrigado! 🎉` · `Quero agendar ensaio` |

**Body:**

```
Olá, {{1}}! 🎂🎉

Feliz aniversário! Que este novo ano seja repleto de momentos incríveis e muitas memórias felizes.

Da parte de toda a equipe MBFoto, desejamos um dia maravilhoso para você! 🥳✨

E se quiser eternizar esse novo ciclo com um ensaio fotográfico especial, estamos aqui para tornar isso realidade. 📸💛
```

**Observações de uso:**
- Variável `{{1}}`: nome do cliente.
- Disparar no dia do aniversário do cliente (manhã, ~8h).
- Categoria MARKETING pois contém sugestão de novo serviço.
- Usar arte personalizada com a marca MBFoto no header.
- O botão "Quero agendar ensaio" abre conversa para agendamento.

---

## Resumo dos Templates

| # | Nome | Categoria | Header | Botões |
|---|------|-----------|--------|--------|
| 1 | `boas_vindas_cliente` | MARKETING | IMAGE | 2x QUICK_REPLY |
| 2 | `album_expirando` | UTILITY | TEXT | 1x URL |
| 3 | `orcamento_aprovado` | UTILITY | NONE | 2x QUICK_REPLY |
| 4 | `evento_amanha` | UTILITY | TEXT | 2x QUICK_REPLY |
| 5 | `fotos_prontas` | UTILITY | IMAGE | 1x URL |
| 6 | `pagamento_lembrete` | UTILITY | NONE | 1x URL |
| 7 | `selecao_fotos_pronta` | UTILITY | TEXT | 1x URL |
| 8 | `contrato_lembrete` | UTILITY | NONE | 1x URL + 1x QUICK_REPLY |
| 9 | `album_extensao_disponivel` | MARKETING | NONE | 2x QUICK_REPLY |
| 10 | `aniversario_cliente` | MARKETING | IMAGE | 2x QUICK_REPLY |

---

## Como Submeter na Meta Business Manager

### Pré-requisitos

1. Conta verificada no **Meta Business Manager** (business.facebook.com)
2. Número de telefone do WhatsApp Business registrado e verificado
3. Acesso à **API do WhatsApp Business** (via BSP ou Cloud API)

### Passo a Passo

#### Opção 1: Via Interface do Meta Business Manager

1. Acesse **business.facebook.com** → **WhatsApp Manager**
2. Selecione sua conta **MBFoto**
3. No menu lateral, clique em **Gerenciamento de conta** → **Message Templates**
4. Clique em **Criar template**
5. Preencha:
   - **Nome:** nome em snake_case (ex: `boas_vindas_cliente`)
   - **Categoria:** selecione UTILITY ou MARKETING conforme indicado
   - **Idioma:** Português (Brasil) — `pt_BR`
6. Configure o **Header** (texto, imagem ou nenhum)
7. Cole o **Body** no campo de texto, adicionando as variáveis com o botão "Adicionar variável"
8. Adicione o **Footer** (opcional)
9. Configure os **Botões** (Quick Reply ou URL)
10. Forneça **exemplos de conteúdo** para cada variável (obrigatório para aprovação)
11. Clique em **Enviar**

#### Opção 2: Via API (Cloud API)

```bash
curl -X POST "https://graph.facebook.com/v18.0/{WABA_ID}/message_templates" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "boas_vindas_cliente",
    "language": "pt_BR",
    "category": "MARKETING",
    "components": [
      {
        "type": "HEADER",
        "format": "IMAGE",
        "example": {
          "header_handle": ["HANDLE_DA_IMAGEM"]
        }
      },
      {
        "type": "BODY",
        "text": "Olá, {{1}}! 👋\n\nSeja muito bem-vindo(a) à MBFoto!...",
        "example": {
          "body_text": [["Maria"]]
        }
      },
      {
        "type": "FOOTER",
        "text": "MBFoto • Marcelo Bloise Fotografia"
      },
      {
        "type": "BUTTONS",
        "buttons": [
          {"type": "QUICK_REPLY", "text": "Ver portfólio"},
          {"type": "QUICK_REPLY", "text": "Falar com Marcelo"}
        ]
      }
    ]
  }'
```

### Dicas para Aprovação

| ✅ Faça | ❌ Evite |
|---------|----------|
| Forneça exemplos realistas para variáveis | Não use conteúdo genérico como "teste" |
| Mantenha texto claro e objetivo | Não use linguagem agressiva ou urgente em excesso |
| Use emojis moderadamente | Não abuse de CAPS LOCK ou pontuação excessiva |
| Inclua opt-out quando necessário (MARKETING) | Não envie templates MARKETING sem consentimento |
| Espere 24h entre resubmissões de rejeitados | Não resubmeta imediatamente após rejeição |

### Prazos de Aprovação

- **Templates UTILITY:** geralmente aprovados em minutos a poucas horas
- **Templates MARKETING:** podem levar de algumas horas a 24h
- **Resubmissões após rejeição:** aguarde pelo menos 24h e corrija o motivo da rejeição

### Observações Importantes

1. **Limites:** Cada WABA pode ter até 250 templates por idioma (após tier upgrade)
2. **Variáveis de exemplo:** São obrigatórias e devem ser representativas do uso real
3. **Imagens de header:** Devem ser enviadas previamente via API de uploads e referenciadas pelo handle
4. **Botões URL com variável:** A URL base deve ser fixa, apenas a parte final pode ser variável (ex: `https://mbfoto.com.br/album/{{1}}`)
5. **Categoria correta:** Templates incorretamente categorizados serão rejeitados ou reclassificados pela Meta

---

*Documento gerado em 03/08/2026 — MBFoto Platform*
