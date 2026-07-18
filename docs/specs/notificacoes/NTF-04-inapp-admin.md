# NTF-04: Notificação In-App Admin (sininho + contador + lida/não lida)

## Metadados
- **ID:** NTF-04
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio — experiência ADM
- **Esforço:** Baixo
- **Dependência:** NTF-03

## Contexto
Ícone de sininho no header do admin com badge de não-lidas. Ao clicar: dropdown com lista de notificações recentes. Clicar em uma notificação: marca como lida + navega para o recurso (deep link).

## Escopo
- `apps/backend/src/handlers/notificacoes/inapp.js` — NOVO
- `apps/frontend/src/components/NotificacaoBell.jsx` — NOVO
- DynamoDB: entidade NOTIFICACAO
- API: GET /admin/notificacoes, PATCH /admin/notificacoes/:id/lida, POST /admin/notificacoes/marcar-todas-lidas

## Fora de Escopo (NÃO TOCAR)
- Dispatcher (NTF-03 — já chama criarNotificacaoInApp)
- Email/WhatsApp (NTF-05/06)
- Regras (NTF-02)

## Spec Técnica

### Entidade NOTIFICACAO
```json
{
  "PK": "TENANT#t123",
  "SK": "NTF#ntf_001",
  "GSI1PK": "TENANT#t123",
  "GSI1SK": "LIDA#0#2026-07-18T10:00:00Z",
  "id": "ntf_001",
  "tipo_evento": "orcamento.aceito",
  "titulo": "🎉 Orçamento aceito!",
  "corpo": "Ana Carolina aceitou o orçamento Casamento Ana & Pedro",
  "lida": false,
  "recurso_tipo": "orcamento",
  "recurso_id": "orc_001",
  "deep_link": "/admin/orcamentos/orc_001",
  "created_at": "2026-07-18T10:00:00Z"
}
```

### API — GET /admin/notificacoes
Query params: `lida` (true|false), `limit` (default 20), `cursor`

```json
{
  "nao_lidas": 5,
  "notificacoes": [
    {
      "id": "ntf_001",
      "titulo": "🎉 Orçamento aceito!",
      "corpo": "Ana Carolina aceitou Casamento Ana & Pedro",
      "lida": false,
      "tipo_evento": "orcamento.aceito",
      "deep_link": "/admin/orcamentos/orc_001",
      "created_at": "2026-07-18T10:00:00Z",
      "tempo_relativo": "há 5 min"
    }
  ],
  "total": 5,
  "cursor": "next_token"
}
```

### API — PATCH /admin/notificacoes/:id/lida
```json
{ "sucesso": true }
```

### API — POST /admin/notificacoes/marcar-todas-lidas
```json
{ "sucesso": true, "marcadas": 5 }
```

### Criação (chamado pelo Dispatcher)
```js
async function criarNotificacaoInApp({ tenantId, regra, evento }) {
  const id = `ntf_${ulid()}`
  
  // Interpolar variáveis no título/corpo
  const titulo = interpolar(regra.titulo_inapp, evento)
  const corpo = interpolar(regra.corpo_inapp, evento)
  const deepLink = gerarDeepLink(evento.dominio, evento.recurso_id)
  
  const ntf = {
    PK: `TENANT#${tenantId}`,
    SK: `NTF#${id}`,
    GSI1PK: `TENANT#${tenantId}`,
    GSI1SK: `LIDA#0#${new Date().toISOString()}`,
    id,
    tipo_evento: evento.acao ? `${evento.dominio}.${evento.acao}` : '',
    titulo,
    corpo,
    lida: false,
    recurso_tipo: evento.dominio,
    recurso_id: evento.recurso_id,
    deep_link: deepLink,
    created_at: new Date().toISOString()
  }
  
  await dynamo.put({ TableName: TABLE, Item: ntf }).promise()
  return ntf
}

function gerarDeepLink(dominio, recursoId) {
  const map = {
    orcamento: '/admin/orcamentos/',
    contrato: '/admin/contratos/',
    pagamento: '/admin/financeiro/',
    album: '/admin/albuns/',
    evento: '/admin/agenda/',
    cliente: '/admin/clientes/',
    whatsapp: '/admin/whatsapp/'
  }
  return `${map[dominio] || '/admin/'}${recursoId}`
}
```

### Frontend — NotificacaoBell.jsx
```jsx
function NotificacaoBell() {
  const [aberto, setAberto] = useState(false)
  const [notificacoes, setNotificacoes] = useState([])
  const [naoLidas, setNaoLidas] = useState(0)
  const navigate = useNavigate()
  
  // Polling a cada 30s
  useEffect(() => {
    const interval = setInterval(fetchNotificacoes, 30000)
    fetchNotificacoes()
    return () => clearInterval(interval)
  }, [])
  
  const marcarLida = async (ntf) => {
    await api.patch(`/admin/notificacoes/${ntf.id}/lida`)
    navigate(ntf.deep_link)
  }
  
  return (
    <div className="ntf-bell">
      <button onClick={() => setAberto(!aberto)} className="bell-button">
        🔔
        {naoLidas > 0 && <span className="bell-badge">{naoLidas > 99 ? '99+' : naoLidas}</span>}
      </button>
      
      {aberto && (
        <div className="ntf-dropdown">
          <div className="ntf-header">
            <span>Notificações</span>
            <button onClick={marcarTodasLidas}>Marcar todas como lidas</button>
          </div>
          <ul className="ntf-lista">
            {notificacoes.map(ntf => (
              <li key={ntf.id} className={ntf.lida ? 'ntf-lida' : 'ntf-nao-lida'} onClick={() => marcarLida(ntf)}>
                <strong>{ntf.titulo}</strong>
                <p>{ntf.corpo}</p>
                <small>{ntf.tempo_relativo}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

### Regras
- Polling 30s para novas notificações
- Badge: nao_lidas > 0 = badge vermelho
- Clicar: marcar lida + navegar (deep link)
- Marcar todas como lidas: batch update
- Dropdown: últimas 20
- Ordenar: mais recente primeiro
- GSI1: permite query eficiente (não-lidas primeiro)
- Retenção: 90 dias (TTL opcional)

## Critérios de Aceite
- [ ] Sininho com badge de não-lidas
- [ ] Dropdown com lista (últimas 20)
- [ ] Clicar marca lida + navega
- [ ] Marcar todas como lidas
- [ ] Polling 30s
- [ ] Deep link funciona
- [ ] Badge 99+ se > 99

## Prompt Pronto para o Kiro CLI

```
Implemente a spec NTF-04: In-App Admin.

1. Crie handlers/notificacoes/inapp.js: GET + PATCH + POST marcar-todas.
2. Crie components/NotificacaoBell.jsx: sininho + dropdown.
3. Entidade NOTIFICACAO + GSI1 (não-lidas primeiro).
4. Polling 30s.
5. Deep link por domínio.
6. Badge vermelho, 99+ max.
7. SAM: 3 rotas.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
