# STP-07 — Página Contato

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | STP-07 |
| **Tipo** | Feature |
| **Prioridade** | P1 |
| **Impacto** | Alto — ponto de captação direto |
| **Esforço** | Baixo |

## Contexto
Página de contato com dois caminhos de captação: (1) "Conversar" → WhatsApp pessoal (link wa.me direto, FORA do sistema); (2) "Solicitar Orçamento" → login + fluxo §6. Exibe também dados de contato direto (telefone, e-mail, cidade, redes).

## Escopo
- **Frontend:** `ContatoPage.jsx` dentro do SiteLayout
- **Consome:** `GET /public/config` (ConfigSite — whatsapp_pessoal, redes) + `GET /public/paginas/contato`
- **Dois CTAs:** WhatsApp (link externo) + Orçamento (rota interna)
- **Dados diretos:** telefone, e-mail, cidade (vêm de Configurações §9)
- **Sem formulário de contato** (decisão do PO — contato vai pro WhatsApp)

## Fora de Escopo (NÃO TOCAR)
- Formulário que gera lead estruturado (consciente — não existe)
- Backend de ConfigSite (STP-01)
- Módulo Orçamento (§6)
- CMS (STP-09)

## Spec Técnica

### Estrutura da Página
```
<ContatoPage>
  <HeroContato>
    - Título "Fale Conosco" ou custom
    - Subtítulo (frase de efeito)
  </HeroContato>
  <DoisCaminhos>
    <CardWhatsApp>
      - Ícone WhatsApp + "Vamos conversar?"
      - Botão verde → window.open(wa.me/{whatsapp_pessoal})
      - Texto: "Tire dúvidas, conheça o trabalho"
    </CardWhatsApp>
    <CardOrcamento>
      - Ícone câmera + "Solicitar Orçamento"
      - Botão laranja → navigate(/orcamento) (exige login)
      - Texto: "Monte sua proposta personalizada"
    </CardOrcamento>
  </DoisCaminhos>
  <DadosDiretos>
    - Telefone (com máscara)
    - E-mail (link mailto)
    - Cidade/região
    - Redes sociais (ícones clicáveis)
  </DadosDiretos>
</ContatoPage>
```

### Dados
- `whatsapp_pessoal` → ConfigSite (STP-01)
- Telefone, e-mail, cidade → Configurações da empresa (§9, endpoint existente)
- Redes → ConfigSite.redes[]

## Critérios de Aceite
- Botão WhatsApp abre wa.me em nova aba com número correto
- Botão Orçamento navega para fluxo de login/orçamento
- Dados de contato renderizam; campo vazio → item oculto
- Redes: só as cadastradas aparecem como ícones
- Responsivo: cards lado a lado desktop, empilhados mobile

## Prompt Pronto para o Kiro CLI
```
Implemente a spec STP-07 (Página Contato do site público).

Crie:
1. src/pages/public/ContatoPage.jsx — Hero + dois cards de captação + dados diretos

Consome: GET /public/config (whatsapp_pessoal, redes) + dados da empresa.
Card WhatsApp: link wa.me em nova aba. Card Orçamento: navigate interno.
Dados diretos: telefone, e-mail, cidade, redes. Campo vazio = item oculto.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
