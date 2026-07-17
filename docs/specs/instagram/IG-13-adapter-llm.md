# IG-13: Adapter LLM Agnóstico (Claude/GPT)

## Metadados
- **ID:** IG-13
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
Adapter que abstrai a chamada a LLMs (Claude, GPT, etc). Permite trocar o provider sem alterar código de negócio. Registra custos (tokens in/out) por chamada.

## Escopo
- `apps/backend/src/services/llmAdapter.js` — NOVO
- SSM: API keys dos providers

## Fora de Escopo (NÃO TOCAR)
- Stories (IG-11, IG-12 — consomem este adapter)
- Gerador de arte (IG-14)
- Publicação (IG-03)

## Spec Técnica

### Interface do Adapter
```js
class LLMAdapter {
  constructor(provider, config) {
    this.provider = provider // 'claude' | 'openai'
    this.config = config
  }
  
  async gerar(systemPrompt, userPrompt, options = {}) {
    const inicio = Date.now()
    let resultado
    
    switch (this.provider) {
      case 'claude':
        resultado = await this.chamarClaude(systemPrompt, userPrompt, options)
        break
      case 'openai':
        resultado = await this.chamarOpenAI(systemPrompt, userPrompt, options)
        break
      default:
        throw new Error(`Provider não suportado: ${this.provider}`)
    }
    
    // Registrar custo
    resultado.custo = this.calcularCusto(resultado.tokens_input, resultado.tokens_output)
    resultado.latencia_ms = Date.now() - inicio
    
    return resultado
  }
}
```

### Providers Suportados
| Provider | Modelo Default | Custo Input (1K) | Custo Output (1K) |
|---|---|---|---|
| claude | claude-sonnet-4-20250514 | $0.003 | $0.015 |
| openai | gpt-4o | $0.005 | $0.015 |

### Chamar Claude (Anthropic)
```js
async chamarClaude(systemPrompt, userPrompt, options) {
  const apiKey = await getSSM('/mbf/{tenant}/ia/anthropic_key')
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.max_tokens || 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  })
  
  const data = await response.json()
  return {
    texto: data.content[0].text,
    tokens_input: data.usage.input_tokens,
    tokens_output: data.usage.output_tokens
  }
}
```

### Chamar OpenAI
```js
async chamarOpenAI(systemPrompt, userPrompt, options) {
  const apiKey = await getSSM('/mbf/{tenant}/ia/openai_key')
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: options.max_tokens || 1024
    })
  })
  
  const data = await response.json()
  return {
    texto: data.choices[0].message.content,
    tokens_input: data.usage.prompt_tokens,
    tokens_output: data.usage.completion_tokens
  }
}
```

### Configuração (DynamoDB)
```json
{
  "PK": "TENANT#t123",
  "SK": "CONFIG#IA",
  "llm_provider": "claude",
  "llm_model": "claude-sonnet-4-20250514",
  "arte_provider": "dall-e",
  "max_tokens": 1024,
  "budget_mensal_usd": 10.00
}
```

## Critérios de Aceite
- [ ] Suporta Claude e OpenAI
- [ ] Troca de provider sem alterar código de negócio
- [ ] Tokens contabilizados (input + output)
- [ ] Custo calculado por chamada
- [ ] API keys em SSM
- [ ] Timeout configurável
- [ ] Erro tratado gracefully

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-13: Adapter LLM Agnóstico.

1. Crie services/llmAdapter.js: classe LLMAdapter com interface gerar().
2. Suportar 'claude' (Anthropic API) e 'openai' (Chat Completions).
3. API keys em SSM.
4. Registrar tokens + custo por chamada.
5. Configuração do provider em DynamoDB (CONFIG#IA).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
