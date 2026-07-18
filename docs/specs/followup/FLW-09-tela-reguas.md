# FLW-09: Tela de Configuração de Réguas (Frontend CRUD)

## Metadados
- **ID:** FLW-09
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** FLW-01

## Contexto
Tela onde o admin cria/edita/ativa/desativa réguas de follow-up. Formulário visual com: domínio, tentativas (com dias, canal, template), prioridade. Preview da timeline de follow-up.

## Escopo
- `apps/frontend/src/pages/admin/FollowupReguas.jsx` — NOVO
- `apps/frontend/src/components/followup/ReguaForm.jsx` — NOVO
- `apps/frontend/src/components/followup/ReguaTimeline.jsx` — NOVO

## Fora de Escopo (NÃO TOCAR)
- Backend CRUD (FLW-01 — já existe)
- Governança (FLW-08)
- Motor/disparos

## Spec Técnica

### Tela Principal — FollowupReguas.jsx
```jsx
function FollowupReguas() {
  const [reguas, setReguas] = useState([])
  const [editando, setEditando] = useState(null)
  
  return (
    <div className="followup-reguas">
      <div className="reguas-header">
        <h1>Réguas de Follow-up</h1>
        <button onClick={() => setEditando({})}>+ Nova Régua</button>
      </div>
      
      {/* Lista de réguas */}
      <div className="reguas-lista">
        {reguas.map(regua => (
          <div key={regua.id} className="regua-card">
            <div className="regua-info">
              <h3>{regua.nome}</h3>
              <Badge>{regua.dominio}</Badge>
              <span>{regua.tentativas.length} tentativas</span>
            </div>
            <ReguaTimeline tentativas={regua.tentativas} />
            <div className="regua-acoes">
              <Switch checked={regua.ativa} onChange={() => toggleAtiva(regua.id)} />
              <button onClick={() => setEditando(regua)}>✏️</button>
              <button onClick={() => deletar(regua.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Modal de edição */}
      {editando && <ReguaForm regua={editando} onSalvar={salvar} onFechar={() => setEditando(null)} />}
    </div>
  )
}
```

### Componente — ReguaForm.jsx
```jsx
function ReguaForm({ regua, onSalvar, onFechar }) {
  const [form, setForm] = useState(regua || {
    nome: '',
    dominio: 'orcamento',
    tentativas: [{ dias_apos_inercia: 3, canal: 'email', template_id: '' }],
    prioridade: 3
  })
  
  const adicionarTentativa = () => {
    if (form.tentativas.length >= 5) return
    setForm(prev => ({
      ...prev,
      tentativas: [...prev.tentativas, { dias_apos_inercia: 7, canal: 'email', template_id: '' }]
    }))
  }
  
  return (
    <div className="regua-form-modal">
      <h2>{regua.id ? 'Editar' : 'Nova'} Régua</h2>
      
      <input placeholder="Nome da régua" value={form.nome} onChange={...} />
      
      <select value={form.dominio} onChange={...}>
        <option value="orcamento">Orçamento</option>
        <option value="contrato">Contrato</option>
        <option value="pagamento">Pagamento</option>
        <option value="album">Álbum</option>
        <option value="feedback">Feedback</option>
      </select>
      
      <h3>Tentativas</h3>
      {form.tentativas.map((tent, idx) => (
        <div key={idx} className="tentativa-row">
          <span>#{idx + 1}</span>
          <input type="number" min="1" value={tent.dias_apos_inercia} />
          <span>dias →</span>
          <select value={tent.canal}>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <select value={tent.template_id}>
            {/* Templates disponíveis */}
          </select>
          <button onClick={() => removerTentativa(idx)}>✕</button>
        </div>
      ))}
      <button onClick={adicionarTentativa}>+ Tentativa</button>
      
      {/* Preview */}
      <ReguaTimeline tentativas={form.tentativas} />
      
      <div className="form-actions">
        <button onClick={onFechar}>Cancelar</button>
        <button onClick={() => onSalvar(form)}>Salvar</button>
      </div>
    </div>
  )
}
```

### Componente — ReguaTimeline.jsx
```jsx
function ReguaTimeline({ tentativas }) {
  return (
    <div className="regua-timeline">
      <div className="timeline-inicio">⏱️ Início</div>
      {tentativas.map((tent, idx) => (
        <div key={idx} className="timeline-step">
          <div className="timeline-line" style={{ width: `${tent.dias_apos_inercia * 10}px` }} />
          <div className={`timeline-node timeline-${tent.canal}`}>
            <span>{tent.canal === 'email' ? '📧' : '📱'}</span>
            <span>{tent.dias_apos_inercia}d</span>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Regras
- Máximo 5 tentativas
- Dias devem ser crescentes
- Template obrigatório por tentativa
- Toggle ativa/desativa (sem deletar)
- Preview timeline em tempo real
- Validação antes de salvar

## Critérios de Aceite
- [ ] Lista réguas existentes
- [ ] Criar nova régua (formulário)
- [ ] Editar régua existente
- [ ] Toggle ativa/desativa
- [ ] Deletar régua
- [ ] Timeline visual
- [ ] Validações (max 5, dias crescentes)
- [ ] Selecionar template por tentativa

## Prompt Pronto para o Kiro CLI

```
Implemente a spec FLW-09: Tela de Réguas.

1. Crie pages/admin/FollowupReguas.jsx: lista + modal CRUD.
2. Crie components/followup/ReguaForm.jsx: formulário.
3. Crie components/followup/ReguaTimeline.jsx: timeline visual.
4. Max 5 tentativas, dias crescentes.
5. Toggle ativa/desativa.
6. Preview timeline em tempo real no form.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
