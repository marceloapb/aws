# CT-11: Aceite do Aditivo (Cliente Aceita/Recusa)

## Metadados
- **ID:** CT-11
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CT-10

## Contexto
O cliente recebe o link do aditivo, visualiza as alterações propostas (comparativo antes/depois), e pode aceitar ou recusar. Se aceitar: dispara recálculo financeiro. Se recusar: notifica admin.

## Escopo
- `apps/backend/src/handlers/contratos/aceitarAditivo.js` — NOVO
- `apps/frontend/src/pages/public/AditivoVisualizar.jsx` — NOVO
- API: GET /public/aditivos/:id, POST /public/aditivos/:id/responder

## Fora de Escopo (NÃO TOCAR)
- CRUD aditivo (CT-10)
- Recálculo financeiro (CT-12)
- Aceite do contrato original (CT-05)

## Spec Técnica

### API — GET /public/aditivos/:id?token=xxx
```json
{
  "aditivo_id": "adit_001",
  "contrato_id": "ct_001",
  "tipo": "aumento",
  "status": "pendente",
  "fotografo": {
    "nome": "Marcelo APB Fotografia",
    "logo_url": "https://..."
  },
  "cliente": {
    "nome": "Ana Carolina Silva"
  },
  "comparativo": {
    "antes": {
      "valor_total": 4500,
      "itens": ["Cobertura 8h", "Álbum 30x30", "200 fotos editadas"]
    },
    "depois": {
      "valor_total": 5200,
      "itens": ["Cobertura 8h", "Álbum 30x30", "200 fotos editadas", "Drone 2h", "Vídeo aéreo"]
    }
  },
  "diferenca": {
    "valor": 700,
    "tipo": "aumento",
    "itens_adicionados": ["Drone 2h", "Vídeo aéreo"],
    "itens_removidos": []
  },
  "motivo": "Adição de drone na cobertura",
  "descricao_alteracao": "Incluída cobertura com drone (2h de voo) + edição de vídeo aéreo"
}
```

### API — POST /public/aditivos/:id/responder
```json
// Input — Aceitar
{
  "token": "jwt_xxx",
  "resposta": "aceito",
  "nome_informado": "Ana Carolina Silva",
  "cpf_informado": "123.456.789-00"
}

// Input — Recusar
{
  "token": "jwt_xxx",
  "resposta": "recusado",
  "motivo_recusa": "Valor fora do orçamento"
}

// Response
{
  "sucesso": true,
  "aditivo_id": "adit_001",
  "status": "aceito",
  "data_resposta": "2026-08-02T14:00:00Z"
}
```

### Backend
```js
async function responderAditivo(aditivoId, payload, request) {
  const aditivo = await getAditivo(aditivoId)
  
  // Validações
  if (aditivo.status !== 'pendente') throw new Error('Aditivo não está pendente')
  
  if (payload.resposta === 'aceito') {
    // Validar identidade (mesmo padrão CT-05)
    if (!validarCPF(payload.cpf_informado)) throw new Error('CPF inválido')
    
    // Registrar aceite
    await atualizarAditivo(aditivoId, {
      status: 'aceito',
      aceite: {
        nome_informado: payload.nome_informado,
        cpf_informado: payload.cpf_informado,
        ip_address: request.headers['x-forwarded-for'],
        user_agent: request.headers['user-agent'],
        data_aceite: new Date().toISOString()
      }
    })
    
    // Emitir evento → CT-12 recalcula
    await emitirEvento('aditivo.aceito', {
      tenant_id: aditivo.tenant_id,
      contrato_id: aditivo.contrato_id,
      aditivo_id: aditivoId,
      tipo: aditivo.tipo,
      valor_novo: aditivo.valor_novo,
      diferenca: aditivo.diferenca
    })
    
  } else if (payload.resposta === 'recusado') {
    await atualizarAditivo(aditivoId, {
      status: 'recusado',
      motivo_recusa: payload.motivo_recusa
    })
    
    await emitirEvento('aditivo.recusado', {
      tenant_id: aditivo.tenant_id,
      contrato_id: aditivo.contrato_id,
      aditivo_id: aditivoId,
      motivo: payload.motivo_recusa
    })
  }
}
```

### Frontend — AditivoVisualizar.jsx
- **Header:** Logo do fotógrafo
- **Comparativo visual:** Lado a lado (antes | depois)
  - Itens adicionados: verde com +
  - Itens removidos: vermelho com -
  - Valor: destaque na diferença
- **Motivo:** Explicação do fotógrafo
- **Ações:**
  - Botão "Aceitar Aditivo" → modal identidade (nome + CPF)
  - Botão "Recusar" → modal motivo (textarea)
- **Após resposta:** Tela de confirmação

### Regras
- Rota pública (sem login) — mesmo padrão CT-04
- Token JWT no query param
- Se já respondido: exibir resultado (não permite alterar)
- Aceite registra IP + user_agent (prova legal)
- Recusa: motivo obrigatório

## Critérios de Aceite
- [ ] Visualização pública do aditivo
- [ ] Comparativo antes/depois
- [ ] Aceitar com nome + CPF
- [ ] Recusar com motivo
- [ ] Registro de prova legal (IP, data)
- [ ] Eventos emitidos (aceito/recusado)
- [ ] Não permite responder duas vezes

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-11: Aceite do Aditivo.

1. Crie handlers/contratos/aceitarAditivo.js: GET visualizar + POST responder.
2. Crie pages/public/AditivoVisualizar.jsx: comparativo + botões.
3. Aceitar: nome + CPF + IP (prova legal).
4. Recusar: motivo obrigatório.
5. Emitir 'aditivo.aceito' ou 'aditivo.recusado'.
6. SAM: rotas públicas GET/POST.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
