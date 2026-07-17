# MBF Design System

## Visão Geral
Sistema de componentes reutilizáveis para o frontend MBF.

## Instalação
Todos os componentes estão em `apps/frontend/src/components/ui/`.

```jsx
import { Button, Input, Card, Badge, Modal, Select, Tabs, KPICard } from '../components/ui';
```

---

## Tokens (`src/styles/tokens.js`)

### Cores
| Token | Valor | Uso |
|-------|-------|-----|
| `accent` | `#EA580C` | Botões primários, links, destaques |
| `accentLight` | `#FEF3EC` | Backgrounds leves |
| `success` | `#10B981` | Confirmações, status positivo |
| `warning` | `#F59E0B` | Alertas, atenção |
| `danger` | `#EF4444` | Erros, exclusões, atrasados |
| `info` | `#3B82F6` | Informações, links |

### Tipografia
| Token | Classes Tailwind | Uso |
|-------|-----------------|-----|
| `h1` | `text-2xl font-bold text-gray-900` | Títulos de página |
| `h2` | `text-xl font-semibold text-gray-900` | Títulos de seção |
| `h3` | `text-lg font-semibold text-gray-900` | Subtítulos |
| `body` | `text-sm text-gray-700` | Texto corrido |
| `caption` | `text-xs text-gray-500` | Legendas, timestamps |
| `label` | `text-sm font-medium text-gray-700` | Labels de formulário |

---

## Componentes

### Button
```jsx
<Button variant="primary" size="md" icon={Plus} loading={false}>
  Novo Cliente
</Button>

// Variantes: primary, secondary, danger, ghost
// Tamanhos: sm, md, lg
// Props: icon, loading, disabled, fullWidth
```

### Input
```jsx
<Input label="Nome" required placeholder="João Silva" error="Campo obrigatório" hint="Nome completo" icon={User} />
```

### Select
```jsx
<Select label="Categoria" options={['Casamento','Ensaio','Corporativo']} required />
// ou
<Select options={[{value:'cas', label:'Casamento'}]} />
```

### Card
```jsx
<Card padding="lg" hover clickable onClick={fn}>
  Conteúdo
</Card>
// Paddings: sm, md, lg
```

### Badge
```jsx
<Badge variant="green" dot>Ativo</Badge>
<Badge variant="red" pulse>Atrasada</Badge>

// Variantes: gray, green, blue, yellow, red, orange, purple, emerald, pink
// Props: dot (bolinha), pulse (animação)
```

### Modal
```jsx
<Modal isOpen={show} onClose={() => setShow(false)} title="Editar Cliente" size="lg"
  footer={<><Button variant="secondary" onClick={close}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}
>
  <form>...</form>
</Modal>
// Tamanhos: sm, md, lg, xl
// Fecha com ESC, clique no overlay, ou botão X
```

### Tabs
```jsx
<Tabs
  tabs={[{key:'todos', label:'Todos', count:42}, {key:'ativos', label:'Ativos'}]}
  active={tab}
  onChange={setTab}
/>
```

### KPICard
```jsx
<KPICard icon={Users} label="Total Clientes" value={142} color="text-blue-500" trend="+12%" />
```

---

## Padrões de Layout

### Página Admin (padrão)
```jsx
<div>
  {/* Header */}
  <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
    <div className="flex items-center gap-3">
      <Icon size={24} style={{ color: '#EA580C' }} />
      <h1 className="text-2xl font-bold text-gray-900">Título</h1>
    </div>
    <Button icon={Plus}>Nova Ação</Button>
  </div>

  {/* KPIs */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <KPICard ... />
  </div>

  {/* Filtros */}
  <Tabs ... />

  {/* Conteúdo */}
  <Card>...</Card>
</div>
```

### Formulário (padrão)
```jsx
<div>
  {/* Voltar */}
  <button className="flex items-center gap-1 text-sm text-gray-500 mb-4">
    <ArrowLeft size={16} /> Voltar
  </button>

  <h1 className="text-2xl font-bold mb-6">Título</h1>

  <form className="space-y-6">
    <Card padding="lg">
      <h2 className="text-lg font-semibold mb-4">Seção</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Campo" ... />
      </div>
    </Card>

    <div className="flex gap-3 justify-end">
      <Button variant="secondary">Cancelar</Button>
      <Button type="submit">Salvar</Button>
    </div>
  </form>
</div>
```

---

## Regras

1. **Nunca hardcode cores** — use tokens ou Tailwind classes padrão
2. **Sempre usar `flex-col sm:flex-row`** em headers que podem quebrar
3. **Grids: sempre com breakpoint** — `grid-cols-2 lg:grid-cols-4` (nunca `grid-cols-4` fixo)
4. **Tabelas: sempre com `overflow-x-auto`** no container pai
5. **Modais: sempre com `max-h-[90vh] overflow-y-auto`**
6. **Imports de ícones: sempre do `lucide-react`**
7. **Máscaras inline** (não importar de arquivos externos que podem falhar)
