# WPP-15: Fallback wa.me Link (Disparo Assistido)

## Metadados
- **ID:** WPP-15
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** Nenhuma (frontend-only)

## Contexto
Se a integração com a Cloud API não estiver configurada ou estiver fora do ar, o sistema gera um link wa.me com mensagem pré-preenchida para o admin enviar manualmente pelo WhatsApp Web/App. É o fallback universal.

## Escopo
- `apps/frontend/src/utils/whatsappLink.js` — NOVO
- `apps/frontend/src/components/whatsapp/FallbackWaMe.jsx` — NOVO

## Fora de Escopo (NÃO TOCAR)
- Envio via API (WPP-06)
- Templates (WPP-03)
- Backend (não tem)

## Spec Técnica

### Geração do Link
```js
function gerarLinkWhatsApp(telefone, mensagem) {
  // Limpar telefone: remover +, espaços, traços, parênteses
  const tel = telefone.replace(/[^\d]/g, '')
  const msg = encodeURIComponent(mensagem)
  return `https://wa.me/${tel}?text=${msg}`
}
```

### Uso em Cada Módulo
| Módulo | Mensagem Pré-Preenchida |
|---|---|
| Orçamento | "Olá {nome}! Seu orçamento para {evento} está pronto: {link}" |
| Pagamento | "Olá {nome}! Lembrete: parcela de R$ {valor} vence em {data}. Pague aqui: {link}" |
| Álbum | "Olá {nome}! Seu álbum está pronto para visualização: {link}" |
| Contrato | "Olá {nome}! Seu contrato está disponível para assinatura: {link}" |
| Follow-up | "Olá {nome}! {mensagem_personalizada}" |

### Frontend — FallbackWaMe.jsx
```jsx
function FallbackWaMe({ telefone, mensagem, label }) {
  const link = gerarLinkWhatsApp(telefone, mensagem)
  
  return (
    <a href={link} target="_blank" rel="noopener noreferrer">
      <Button variant="outline" color="green">
        <WhatsAppIcon /> {label || 'Enviar via WhatsApp'}
      </Button>
    </a>
  )
}
```

### Quando Usar
- Cloud API NÃO configurada (conta inexistente)
- Cloud API fora do ar (erro persistente)
- Admin escolhe "enviar manualmente"
- Modo teste sem sandbox configurado

### Regras
- Telefone deve ter DDI (55 para Brasil)
- Mensagem max 1000 chars (limitação URL)
- Abrir em nova aba
- Log local (localStorage) para rastrear envios manuais
- Exibir tooltip: "Abrirá o WhatsApp Web com a mensagem pronta"

## Critérios de Aceite
- [ ] Link wa.me gerado corretamente
- [ ] Telefone formatado (só números com DDI)
- [ ] Mensagem pré-preenchida
- [ ] Abre nova aba
- [ ] Funciona sem Cloud API configurada
- [ ] Disponível em todos os módulos que enviam WhatsApp
- [ ] Tooltip explicativo

## Prompt Pronto para o Kiro CLI

```
Implemente a spec WPP-15: Fallback wa.me Link.

1. Crie utils/whatsappLink.js: gerarLinkWhatsApp(telefone, mensagem).
2. Crie components/whatsapp/FallbackWaMe.jsx: botão que abre wa.me.
3. Limpar telefone, encodeURIComponent na mensagem.
4. Disponibilizar em orçamentos, pagamentos, álbuns, contratos.
5. Funcionar sem Cloud API configurada.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
