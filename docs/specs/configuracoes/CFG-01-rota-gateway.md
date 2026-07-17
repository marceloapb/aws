# CFG-01: Rota dedicada /configuracoes/gateway

## Metadados
- **ID:** CFG-01
- **Tipo:** Readequação
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
A aba "Pagamento" dentro de Configurações > Integrações é inadequada: o gateway (§21) tem complexidade própria (11 provedores, credenciais distintas, matriz de capacidades, webhook, ambiente por provedor). Cabe em rota separada no menu lateral ou como item de primeiro nível em Configurações.

## Escopo
- `apps/frontend/src/pages/admin/Configuracoes/index.jsx` — remover sub-aba "Pagamento"
- `apps/frontend/src/pages/admin/Configuracoes/Gateway.jsx` — NOVO componente
- `apps/frontend/src/App.js` — nova rota `/admin/configuracoes/gateway`
- Sidebar/nav — novo item "Gateway de Pagamento" sob Configurações

## Fora de Escopo (NÃO TOCAR)
- WhatsApp, Instagram, Google Calendar permanecem em Integrações
- Dados da Empresa, Prazos e Políticas, Backup não mudam
- Backend: `apps/api/src/routes/admin-configuracoes.js` não muda nesta spec
- Lógica real dos adapters de pagamento

## Spec Técnica

### Frontend
- Criar `apps/frontend/src/pages/admin/Configuracoes/Gateway.jsx`
- Componente placeholder com título "Gateway de Pagamento" e mensagem "Em construção"
- Registrar rota em App.js: `<Route path="/admin/configuracoes/gateway" element={<Gateway />} />`
- Adicionar item no menu lateral sob "Configurações"

### Backend
- Nenhuma alteração nesta spec

## Critérios de Aceite
- [ ] Configurações > Integrações NÃO mostra mais aba Pagamento
- [ ] Existe menu/rota separado "Gateway de Pagamento"
- [ ] A nova tela carrega vazia (placeholder) pronta para CFG-02/03
- [ ] Navegação não quebra — rotas existentes continuam funcionando

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-01: Rota dedicada /configuracoes/gateway.

1. Crie apps/frontend/src/pages/admin/Configuracoes/Gateway.jsx — componente React com título "Gateway de Pagamento", ícone CreditCard do lucide-react, e texto placeholder "Configure seus provedores de pagamento aqui."
2. Registre a rota /admin/configuracoes/gateway em apps/frontend/src/App.js importando o novo componente.
3. Adicione o item "Gateway" no menu lateral/sidebar sob a seção Configurações.
4. Se existir sub-aba "Pagamento" dentro de Integrações (nas pages de Configurações), remova-a.
5. Use Tailwind CSS conforme style-guide.md. Card com bg-white, rounded-xl, shadow-sm, p-6.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
