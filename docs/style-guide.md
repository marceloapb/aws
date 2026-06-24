# 📐 Style Guide — Horizons Photography System

---

## 1. Convenções de Código

### 1.1 JavaScript/Node.js

- **Módulos:** ESM (`import/export`), nunca CommonJS
- **Variáveis:** `camelCase` para variáveis e funções
- **Constantes:** `UPPER_SNAKE_CASE` para constantes globais
- **Arquivos:** `kebab-case.js` para todos os arquivos
- **Classes:** `PascalCase`
- **Async/Await:** Sempre usar async/await, nunca callbacks
- **Strings:** Template literals para interpolação
- **Comparação:** Sempre `===` e `!==`

### 1.2 React/Frontend

- **Componentes:** `PascalCase.jsx`
- **Hooks:** `useNomeDoHook.js`
- **Utils:** `camelCase.js`
- **Páginas:** `PascalCase.jsx` (ex: `Dashboard.jsx`)
- **Props:** Desestruturar sempre
- **Estado:** `useState` para local, Context para global
- **Efeitos:** Cleanup em todos os `useEffect` com subscriptions

---

## 2. Padrões de API

### 2.1 Resposta de Sucesso

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 2.2 Resposta de Erro

```json
{
  "success": false,
  "message": "Descrição do erro",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "email", "message": "Email inválido" }
  ]
}
```

### 2.3 Códigos de Erro

| Código | HTTP | Descrição |
|--------|------|-----------|
| VALIDATION_ERROR | 400 | Dados inválidos |
| UNAUTHORIZED | 401 | Não autenticado |
| FORBIDDEN | 403 | Sem permissão |
| NOT_FOUND | 404 | Recurso não encontrado |
| CONFLICT | 409 | Conflito (duplicado) |
| RATE_LIMITED | 429 | Muitas requisições |
| INTERNAL_ERROR | 500 | Erro interno |
| GATEWAY_ERROR | 502 | Erro no gateway de pagamento |

---

## 3. Padrões de Rota

### 3.1 Estrutura

```javascript
import { Router } from 'express';
import { adminAuth } from '../middlewares/adminAuth.js';
import { getPocketbaseClient } from '../config/pocketbase.js';

const router = Router();

// GET /api/admin/recurso — Listar
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const pb = await getPocketbaseClient();
    const { page = 1, perPage = 20, search = '' } = req.query;
    
    const result = await pb.collection('recurso').getList(page, perPage, {
      filter: search ? `nome ~ "${search}"` : '',
      sort: '-created',
    });
    
    res.json({
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        perPage: result.perPage,
        total: result.totalItems,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### 3.2 Regras

- Sempre usar `try/catch` com `next(error)`
- Sempre validar inputs antes de processar
- Sempre retornar formato padronizado
- Nunca expor dados sensíveis (senhas, tokens)
- Sempre paginar listagens

---

## 4. Padrões de Frontend

### 4.1 Estrutura de Página

```jsx
import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Card, Button, Loading, EmptyState } from '../../components/ui';

export default function NomeDaPagina() {
  const api = useApi();
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      const response = await api.get('/admin/recurso');
      setDados(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <EmptyState message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Título</h1>
        <Button onClick={() => {}}>Ação</Button>
      </div>
      {/* conteúdo */}
    </div>
  );
}
```

### 4.2 TailwindCSS

- Usar classes utilitárias, nunca CSS custom
- Espaçamento: `space-y-6` para seções, `space-y-4` para itens
- Cards: `bg-white rounded-lg shadow p-6`
- Botão primário: `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg`
- Botão secundário: `bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg`
- Texto: `text-gray-900` (títulos), `text-gray-600` (subtítulos), `text-gray-500` (labels)

---

## 5. Segurança

### 5.1 Regras Obrigatórias

- Nunca logar tokens, senhas ou dados sensíveis
- Sempre validar webhook signatures antes de processar
- Sempre sanitizar inputs do usuário
- Sempre usar parameterized queries (PocketBase faz isso)
- Rate limiting em todas as rotas públicas
- CORS restrito aos domínios permitidos
- Helmet.js para headers de segurança
- JWT com expiração curta (7 dias) + refresh token (30 dias)

### 5.2 Mascaramento de Dados

```javascript
// Nunca retornar API keys completas
function maskApiKey(key) {
  if (!key || key.length < 8) return '***';
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}
```

---

## 6. Nomenclatura de Arquivos

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Rota backend | `admin-{recurso}.js` | `admin-clientes.js` |
| Service | `{nome}Service.js` | `whatsappService.js` |
| Adapter | `{gateway}.js` | `mercadopago.js` |
| Job | `{nome}Job.js` | `albumRetentionJob.js` |
| Página admin | `{Nome}.jsx` | `Clientes.jsx` |
| Página cliente | `Client{Nome}.jsx` | `ClientAlbuns.jsx` |
| Componente | `{Nome}.jsx` | `KPICard.jsx` |
| Hook | `use{Nome}.js` | `useAuth.js` |
| Util | `{nome}.js` | `formatters.js` |
| Config | `{nome}.js` | `pocketbase.js` |
| Middleware | `{nome}.js` | `adminAuth.js` |
