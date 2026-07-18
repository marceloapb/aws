# DSH-07: Badges de Contadores no Menu

## Metadados
- **ID:** DSH-07
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** DSH-01, DSH-03

## Contexto
Badges numéricos nos itens do menu lateral (sidebar) indicando contagens de pendências em cada módulo. Ex: "Orçamentos (3)", "Financeiro (2)". Dá visibilidade imediata sem precisar abrir cada tela.

## Escopo
- `apps/backend/src/handlers/dashboard/contadores.js` — NOVO
- Modificar: `apps/frontend/src/components/Sidebar.jsx`
- API: GET /admin/dashboard/contadores

## Fora de Escopo (NÃO TOCAR)
- Pendências detalhadas (DSH-03 — já faz)
- Notificações (DSH-04)
- Layout do shell (DSH-01)

## Spec Técnica

### API — GET /admin/dashboard/contadores
```json
{
  "contadores": {
    "orcamentos": 3,
    "contratos": 1,
    "financeiro": 2,
    "albuns": 1,
    "whatsapp": 4,
    "agenda": 0,
    "clientes": 0,
    "equipamentos": 0,
    "instagram": 0,
    "configuracoes": 0
  }
}
```

### Backend
```js
async function getContadores(tenantId) {
  const [orc, ct, fin, alb, wpp] = await Promise.all([
    countOrcamentosPendentes(tenantId),
    countContratosAguardando(tenantId),
    countPagamentosAtrasados(tenantId),
    countAlbunsRevisao(tenantId),
    countMensagensNaoLidas(tenantId)
  ])
  
  return {
    contadores: {
      orcamentos: orc,
      contratos: ct,
      financeiro: fin,
      albuns: alb,
      whatsapp: wpp,
      agenda: 0,
      clientes: 0,
      equipamentos: 0,
      instagram: 0,
      configuracoes: 0
    }
  }
}
```

### Frontend — Sidebar Badge
```jsx
// Dentro do Sidebar.jsx
{menuItems.map(item => (
  <NavLink key={item.path} to={item.path} className="sidebar-item">
    <span className="sidebar-icon">{item.icon}</span>
    <span className="sidebar-label">{item.label}</span>
    {contadores[item.key] > 0 && (
      <span className="sidebar-badge">{contadores[item.key]}</span>
    )}
  </NavLink>
))}
```

### Estilo
```css
.sidebar-badge {
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #ff4444;
  color: white;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
}
```

### Regras
- Chamar API ao montar Sidebar (1x)
- Atualizar a cada 60s (polling leve)
- Badge só aparece se count > 0
- Cor: vermelho (atenção)
- Máximo exibido: 99+ (se > 99)
- Não exibir badge para módulos sem pendência definida

## Critérios de Aceite
- [ ] Badge numérico nos itens com pendências
- [ ] Se count = 0: sem badge
- [ ] Polling 60s
- [ ] Queries paralelas no backend
- [ ] Max "99+"
- [ ] Estilo: badge vermelho, arredondado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec DSH-07: Badges no Menu.

1. Crie handlers/dashboard/contadores.js: GET /admin/dashboard/contadores.
2. Modifique Sidebar.jsx: exibir badge se count > 0.
3. 5 queries paralelas para contar pendências.
4. Polling 60s.
5. Badge vermelho, 99+ se exceder.
6. SAM: rota GET.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
