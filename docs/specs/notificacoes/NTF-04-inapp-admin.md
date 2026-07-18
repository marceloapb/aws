# NTF-04: Notificação In-App Admin (Sininho + Contador + Lida/Não Lida)

## Metadados
- **ID:** NTF-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** NTF-03

## Contexto
Ícone de sininho no header do admin com badge de contagem. Ao clicar, abre dropdown com notificações recentes. Admin pode marcar como lida, marcar todas como lidas, ou clicar para navegar ao recurso.

## Escopo
- `apps/backend/src/handlers/notificacoes/inapp.js` — NOVO
- `apps/frontend/src/components/NotificacaoSininho.jsx` — NOVO
- DynamoDB: entidade NOTIFICACAO
- API: GET /admin/notificacoes, PATCH /admin/notificacoes/:id/lida, PATCH /admin/notificacoes/ler-todas

## Fora de Escopo (NÃO TOCAR)
- Dispatcher (NTF-03 — chama criarNotificacaoInApp)
- Email/WhatsApp (NTF-05/06)
- WebSocket/real-time (futuro — por ora, polling)

## Spec Técnica

### Entidade NOTIFICACAO
```json
{
  "PK": "TENANT#t123",
  "SK": "NTF#ntf_001",
  "GSI1PK": "TENANT#t123",
  "GSI1SK": "LIDA#false#2026-07-17T10:00:00Z",
  "id": "ntf_001",
  "tipo_evento": "orcamento.aceito",
  "titulo": "💰 Orçamento aceito!",
  "corpo": "Ana Carolina aceitou o orçamento de R$ 5.500",
  "lida": false,
  "recurso_tipo": "orcamento",
  "recurso_id": "orc_001",
  "link": "/admin/orcamentos/orc_001",
  "created_at": "2026-07-17T10:00:00Z"
}
```

### API — GET /admin/notificacoes
Query params: `lida` (true|false|all), `limit` (default 20), `cursor`

```json
{
  "nao_lidas": 5,
  "notificacoes": [
    {
      "id": "ntf_001",
      "titulo": "💰 Orçamento aceito!",
      "corpo": "Ana Carolina aceitou o orçamento de R$ 5.500",
      "lida": false,
      "tipo_evento": "orcamento.aceito",
      "link": "/admin/orcamentos/orc_001",
      "created_at": "2026-07-17T10:00:00Z",
      "tempo_relativo": "há 2 horas"
    }
  ],
  "total": 5,
  "cursor": "next"
}
```

### API — PATCH /admin/notificacoes/:id/lida
```json
{ "sucesso": true }
```

### API — PATCH /admin/notificacoes/ler-todas
```json
{ "sucesso": true, "marcadas": 5 }
```

### Backend — Criar Notificação (chamado pelo Dispatcher)
```js
async function criarNotificacaoInApp({ tenantId, titulo_inapp, corpo_inapp, tipo_evento, payload }) {
  const id = `ntf_${ulid()}`
  const link = gerarLink(tipo_evento, payload)
  
  const notificacao = {
    PK: `TENANT#${tenantId}`,
    SK: `NTF#${id}`,
    GSI1PK: `TENANT#${tenantId}`,
    GSI1SK: `LIDA#false#${new Date().toISOString()}`,
    id,
    tipo_evento,
    titulo: renderTemplate(titulo_inapp, payload),
    corpo: renderTemplate(corpo_inapp, payload),
    lida: false,
    recurso_tipo: tipo_evento.split('.')[0],
    recurso_id: payload.recurso_id,
    link,
    created_at: new Date().toISOString()
  }
  
  await dynamo.put({ TableName: TABLE, Item: notificacao }).promise()
}

function gerarLink(tipoEvento, payload) {
  const mapa = {
    'orcamento': `/admin/orcamentos/${payload.recurso_id}`,
    'contrato': `/admin/contratos/${payload.recurso_id}`,
    'pagamento': `/admin/financeiro/${payload.recurso_id}`,
    'album': `/admin/albuns/${payload.recurso_id}`,
    'evento': `/admin/agenda/${payload.recurso_id}`,
    'mensagem': `/admin/whatsapp/${payload.conversa_id}`,
    'feedback': `/admin/pesquisa/${payload.recurso_id}`
  }
  const tipo = tipoEvento.split('.')[0]
  return mapa[tipo] || '/admin'
}
```

### Frontend — NotificacaoSininho.jsx
```jsx
function NotificacaoSininho() {
  const [notificacoes, setNotificacoes] = useState([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [aberto, setAberto] = useState(false)
  
  // Polling a cada 30s
  useEffect(() => {
    const interval = setInterval(buscarNotificacoes, 30000)
    buscarNotificacoes()
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="sininho-container">
      <button onClick={() => setAberto(!aberto)} className="sininho-btn">
        🔔
        {naoLidas > 0 && <span className="sininho-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>
      
      {aberto && (
        <div className="sininho-dropdown">
          <div className="sininho-header">
            <h4>Notificações</h4>
            <button onClick={marcarTodasLidas}>Marcar todas como lidas</button>
          </div>
          <div className="sininho-lista">
            {notificacoes.map(ntf => (
              <div key={ntf.id} className={`sininho-item ${!ntf.lida ? 'nao-lida' : ''}`} onClick={() => abrirNotificacao(ntf)}>
                <p className="sininho-titulo">{ntf.titulo}</p>
                <p className="sininho-corpo">{ntf.corpo}</p>
                <span className="sininho-tempo">{ntf.tempo_relativo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

### Regras
- Polling 30s (sem WebSocket por ora)
- Badge: max "9+" se > 9
- Click na notificação: navegar ao link + marcar como lida
- Marcar todas como lidas: batch update
- Ordenar por created_at DESC
- Reter últimas 100 notificações (TTL 30 dias)
- GSI1 para query eficiente de não-lidas

## Critérios de Aceite
- [ ] Sininho com badge de contagem
- [ ] Dropdown com lista de notificações
- [ ] Marcar individual como lida
- [ ] Marcar todas como lidas
- [ ] Click navega ao recurso
- [ ] Polling 30s
- [ ] Badge max "9+"
- [ ] Notificações não-lidas destacadas

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-04: In-App Admin.

1. Crie handlers/notificacoes/inapp.js: GET + 2 PATCH.
2. Crie components/NotificacaoSininho.jsx.
3. Entidade NOTIFICACAO com GSI1 (lida/não-lida).
4. criarNotificacaoInApp() chamada pelo dispatcher.
5. Polling 30s, badge, dropdown.
6. Click navega ao link.
7. SAM: 3 rotas.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
