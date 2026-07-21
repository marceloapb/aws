# Padrão de Layout — Páginas Admin

Este documento define o padrão obrigatório de layout para todas as páginas da área administrativa do sistema MBF.

## Estrutura de uma Página

Toda página admin DEVE seguir esta estrutura (de cima para baixo):

```
1. PageHeader (título + ícone + ações)
2. KPIs (se aplicável)
3. Tabs / Filtros (se aplicável)
4. Conteúdo principal (tabela, cards, formulário)
```

## Componentes Obrigatórios

### 1. PageHeader

Use o componente `PageHeader` de `../../components/ui` para TODOS os cabeçalhos de página.

```jsx
import { PageHeader } from '../../components/ui';
import { Package } from 'lucide-react';

<PageHeader
  icon={Package}
  title="Produtos e Serviços"
  subtitle="Descrição opcional da página"  // opcional
  actions={<Button>+ Novo Item</Button>}   // opcional
/>
```

**Regras:**
- `icon`: sempre um ícone lucide-react que represente a seção
- `title`: texto em `text-2xl font-bold text-gray-900`
- `subtitle`: texto em `text-sm text-gray-500` (usar apenas quando a página precisa de contexto adicional)
- `actions`: botões de ação no lado direito (botão primário usa `backgroundColor: '#EA580C'`)

### 2. KPICard

Use o componente `KPICard` de `../../components/ui` para indicadores numéricos.

```jsx
import { KPICard } from '../../components/ui';
import { DollarSign } from 'lucide-react';

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <KPICard icon={DollarSign} label="Receita" value="R$ 5.000" accent="text-green-600 bg-green-50" />
</div>
```

**Regras:**
- Layout horizontal: ícone à esquerda em box colorido + label/value à direita
- Grid responsivo: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N`
- Cada KPI deve ter um `accent` com cores semânticas (verde=positivo, vermelho=alerta, azul=info, etc)

### 3. Tabs (Navegação por abas)

Usar estilo **underline** para abas de navegação dentro da página:

```jsx
<div className="flex border-b border-gray-200">
  <button className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
    active ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
  }`}>
    Tab Label
  </button>
</div>
```

**Regras:**
- SEMPRE usar estilo underline (`border-b-2`) — NÃO usar pills/badges como tabs
- Cor ativa: `#EA580C` (accent)
- Ícones nas tabs são opcionais

### 4. Filtros e Busca

```jsx
<div className="flex flex-wrap gap-3 items-center">
  {/* Busca SEMPRE à esquerda */}
  <div className="relative flex-1 min-w-[200px]">
    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <input className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
  </div>
  {/* Filtros dropdown à direita */}
  <select className="border rounded-lg px-3 py-2 text-sm">...</select>
</div>
```

**Regras:**
- Input de busca: SEMPRE posicionado à esquerda, com ícone Search interno
- Dropdowns de filtro: à direita da busca
- Classe do container: `flex flex-wrap gap-3 items-center`

## Container da Página

- Usar `className="space-y-6"` como container principal (NÃO usar `p-6 max-w-7xl mx-auto` pois o Layout já aplica padding e max-width)
- O `Layout.jsx` já aplica `p-4 lg:p-6` e `max-w-5xl mx-auto`

## Tabelas

- Container: `bg-white rounded-xl border border-gray-200 overflow-hidden`
- Header: `bg-gray-50 border-b border-gray-200`
- Cells: `px-4 py-3`
- Hover row: `hover:bg-gray-50`

## Cores do Sistema

| Token | Valor | Uso |
|-------|-------|-----|
| accent | `#EA580C` | Botões primários, ícones header, tabs ativas |
| accent-hover | `#C2410C` | Hover de botões |
| accent-light | `#FFF7ED` | Backgrounds leves |
| sidebar | `#1F2937` | Sidebar |

## Exemplo Completo

```jsx
import { PageHeader, KPICard } from '../../components/ui';
import { FileText, Plus, CheckCircle, DollarSign } from 'lucide-react';

export default function MinhaListagem() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Minha Página"
        actions={<button className="..."><Plus size={16} /> Novo</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={CheckCircle} label="Total" value={42} accent="text-green-600 bg-green-50" />
        <KPICard icon={DollarSign} label="Receita" value="R$ 5k" accent="text-blue-600 bg-blue-50" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">...</div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">...</div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">...</div>
    </div>
  );
}
```
