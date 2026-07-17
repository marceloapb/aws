# IG-14: Adapter Gerador de Arte Agnóstico

## Metadados
- **ID:** IG-14
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** IG-13

## Contexto
Adapter que abstrai a geração de imagens (DALL-E, Stability, Midjourney API). Recebe um prompt + foto base (opcional) e retorna imagem 1080x1920. Registra custos por geração.

## Escopo
- `apps/backend/src/services/arteAdapter.js` — NOVO
- SSM: API keys dos providers

## Fora de Escopo (NÃO TOCAR)
- LLM (IG-13 — já existe)
- Stories (IG-11/12 — consomem este adapter)
- Publicação (IG-03)

## Spec Técnica

### Interface do Adapter
```js
class ArteAdapter {
  constructor(provider, config) {
    this.provider = provider // 'dall-e' | 'stability'
    this.config = config
  }
  
  async gerar(prompt, options = {}) {
    const inicio = Date.now()
    let resultado
    
    switch (this.provider) {
      case 'dall-e':
        resultado = await this.chamarDallE(prompt, options)
        break
      case 'stability':
        resultado = await this.chamarStability(prompt, options)
        break
      default:
        throw new Error(`Provider não suportado: ${this.provider}`)
    }
    
    resultado.latencia_ms = Date.now() - inicio
    return resultado
  }
}
```

### Providers Suportados
| Provider | Modelo | Custo/Imagem | Resolução |
|---|---|---|---|
| dall-e | DALL-E 3 | ~$0.04 (1024x1792) | 1024x1792 |
| stability | SDXL 1.0 | ~$0.03 | 1024x1024 (resize) |

### Chamar DALL-E
```js
async chamarDallE(prompt, options) {
  const apiKey = await getSSM('/mbf/{tenant}/ia/openai_key')
  
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1792',
      quality: options.quality || 'standard',
      response_format: 'url'
    })
  })
  
  const data = await response.json()
  return {
    imagem_url: data.data[0].url,
    revised_prompt: data.data[0].revised_prompt,
    custo_usd: 0.04
  }
}
```

### Chamar Stability
```js
async chamarStability(prompt, options) {
  const apiKey = await getSSM('/mbf/{tenant}/ia/stability_key')
  
  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text_prompts: [{ text: prompt, weight: 1 }],
      cfg_scale: 7,
      height: 1920,
      width: 1080,
      steps: 30,
      samples: 1
    })
  })
  
  const data = await response.json()
  return {
    imagem_base64: data.artifacts[0].base64,
    custo_usd: 0.03
  }
}
```

### Pós-processamento
```js
async function salvarImagemGerada(tenantId, storyId, resultado) {
  let buffer
  
  if (resultado.imagem_url) {
    // DALL-E retorna URL: baixar
    const res = await fetch(resultado.imagem_url)
    buffer = await res.buffer()
  } else {
    // Stability retorna base64
    buffer = Buffer.from(resultado.imagem_base64, 'base64')
  }
  
  const key = `tenants/${tenantId}/stories/${storyId}.png`
  await s3.putObject({ Bucket: MEDIA_BUCKET, Key: key, Body: buffer, ContentType: 'image/png' })
  
  return key
}
```

## Critérios de Aceite
- [ ] Suporta DALL-E e Stability
- [ ] Troca de provider sem alterar negócio
- [ ] Imagem gerada 1080x1920
- [ ] Custo registrado por geração
- [ ] Imagem salva no S3
- [ ] API keys em SSM
- [ ] Timeout tratado

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-14: Adapter Gerador de Arte.

1. Crie services/arteAdapter.js: classe ArteAdapter com gerar().
2. Suportar 'dall-e' (OpenAI Images) e 'stability' (SDXL).
3. Salvar imagem gerada no S3.
4. Registrar custo por geração.
5. API keys em SSM.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
