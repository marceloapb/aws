# DSH-04: Notificações In-App (Sininho)

## Metadados
- **ID:** DSH-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** DSH-01

## Contexto
Sininho na topbar que exibe notificações em tempo real para o admin. Eventos: novo orçamento aceito, pagamento recebido, contrato assinado, resposta de cliente no WhatsApp, feedback recebido, token Google expirado. Badge com contagem de não-lidas.

## Escopo
- `apps/backend/src/handlers/notificacoes/listar.js` — NOVO
- `apps/backend/src/handlers/notificacoes/marcarLida.js` — NOVO
- `apps/frontend/src/components/Topbar/NotificacoesBell.jsx` — NOVO
- `apps/frontend/src/components/Topbar/NotificacoesDropdown.jsx` — NOVO
- API: GET /admin/notificacoes, PATCH /admin/notificacoes/:id/lida, PATCH /admin/notificacoes/marcar-todas
- DynamoDB: entidade NOTIFICACAO_ADMIN

## Fora de Escopo (NÃO TOCAR)
- WebSocket/real-time push (futuro — por ora polling 30s)
- Notificações do cliente (módulo Central)
- Email de notificação (já existe em cada módulo)

## Spec Técnica

### Entidade NOTIFICACAO_ADMIN
```json
{
  "PK": "TENANT#t123",
  "SK": "NOTIF#2026-07-17T22:00:00Z#notif_001",
  "id": "notif_001",
  "tipo": "orcamento_aceito",
  "titulo": "Orçamento aceito!",
  "mensagem": "Ana Carolina aceitou o orçamento de R$ 5.500",
  "icone": "💰",
  "cor": "green",
  "lida": false,
  "acao_url": "/admin/orcamentos/orc_001",
  "metadata": { "orcamento_id": "orc_001", "cliente": "Ana Carolina" },
  "created_at": "2026-07-17T22:00:00Z",
  "ttl": 1755302400
}
```

### Tipos de Notificação
| Tipo | Título | Ícone | Cor | Origem |
|---|---|---|---|---|
| orcamento_aceito | Orçamento aceito! | 💰 | green | ORC |
| pagamento_recebido | Pagamento recebido | 💳 | green | FIN |
| contrato_assinado | Contrato assinado | 📋 | blue | CT |
| cliente_respondeu | Cliente respondeu | 💬 | blue | WPP |
| feedback_recebido | Novo feedback | ⭐ | yellow | SAT |
| token_expirado | Google desconectado | ⚠️ | red | GCL |
| album_expirar | Álbum expirando | 📸 | orange | ALB |

### API — GET /admin/notificacoes
Query params: `lida` (bool), `limit` (default 20), `cursor`

```json
{
  "nao_lidas": 4,
  "notificacoes": [
    {
      "id": "notif_001",
      "tipo": "orcamento_aceito",
      "titulo": "Orçamento aceito!",
      "mensagem": "Ana Carolina aceitou o orçamento de R$ 5.500",
      "icone": "💰",
      "lida": false,
      "acao_url": "/admin/orcamentos/orc_001",
      "created_at": "2026-07-17T22:00:00Z",
      "tempo_relativo": "há 2 horas"
    }
  ],
  "cursor": "next_token"
}
```

### API — PATCH /admin/notificacoes/:id/lida
```json
{ "sucesso": true }
```

### API — PATCH /admin/notificacoes/marcar-todas
```json
{ "sucesso": true, "marcadas": 4 }
```

### Frontend — NotificacoesBell.jsx
```jsx
function NotificacoesBell() {
  const [naoLidas, setNaoLidas] = useState(0)
  const [aberto, setAberto] = useState(false)
  
  // Polling a cada 30s
  useEffect(() => {
    const interval = setInterval(fetchNaoLidas, 30000)
    fetchNaoLidas()
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="notificacoes-bell">
      <button onClick={() => setAberto(!aberto)}>
        🔔
        {naoLidas > 0 && <span className="bell-badge">{naoLidas}</span>}
      </button>
      {aberto && <NotificacoesDropdown onClose={() => setAberto(false)} />}
    </div>
  )
}
```

### Frontend — NotificacoesDropdown.jsx
```jsx
function NotificacoesDropdown({ onClose }) {
  const [notificacoes, setNotificacoes] = useState([])
  
  return (
    <div className="notificacoes-dropdown">
      <div className="dropdown-header">
        <h3>Notificações</h3>
        <button onClick={marcarTodasLidas}>Marcar todas como lidas</button>
      </div>
      <div className="dropdown-body">
        {notificacoes.map(notif => (
          <div
            key={notif.id}
            className={`notif-item ${notif.lida ? '' : 'notif-nao-lida'}`}
            onClick={() => navegar(notif.acao_url)}
          >
            <span className="notif-icone">{notif.icone}</span>
            <div className="notif-content">
              <p className="notif-titulo">{notif.titulo}</p>
              <p className="notif-mensagem">{notif.mensagem}</p>
              <span className="notif-tempo">{notif.tempo_relativo}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Regras
- Polling 30s (sem WebSocket por ora)
- Badge com contagem de não-lidas
- Click na notificação: marcar como lida + navegar
- "Marcar todas como lidas"
- TTL: 30 dias (auto-limpeza DynamoDB)
- Máximo 20 notificações no dropdown
- Notificação criada pelo módulo origem (via função compartilhada)

## Critérios de Aceite
- [ ] Sininho na topbar com badge
- [ ] Dropdown com lista de notificações
- [ ] Marcar como lida (individual e todas)
- [ ] Click navega para ação
- [ ] Polling 30s
- [ ] TTL 30 dias
- [ ] 7 tipos de notificação funcionam

## Prompt Pronto para o Kiro CLI

```
Implemente a spec DSH-04: Notificações In-App.

1. Crie handlers/notificacoes/listar.js + marcarLida.js.
2. Crie components/Topbar/NotificacoesBell.jsx + NotificacoesDropdown.jsx.
3. Entidade NOTIFICACAO_ADMIN no DynamoDB.
4. Polling 30s, badge com contagem.
5. Click: marcar lida + navegar.
6. "Marcar todas como lidas".
7. SAM: 3 rotas (GET, PATCH/:id, PATCH/marcar-todas).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
