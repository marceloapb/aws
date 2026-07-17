# IG-05: Agendamento de Posts (EventBridge Scheduler)

## Metadados
- **ID:** IG-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** IG-03

## Contexto
O admin agenda um post para data/hora futura. O sistema salva com status='agendado' e cria um schedule no EventBridge Scheduler que invoca a Lambda de publicação no momento certo.

## Escopo
- `apps/backend/src/handlers/instagram/agendar.js` — NOVO
- `apps/backend/src/handlers/instagram/executarAgendado.js` — NOVO
- EventBridge Scheduler: one-time schedule
- API: POST /admin/instagram/agendar, DELETE /admin/instagram/agendar/:postId

## Fora de Escopo (NÃO TOCAR)
- Publicação imediata (IG-03)
- Central (IG-06 — visualização)
- Agenda do fotógrafo (módulo Agenda)

## Spec Técnica

### API — POST /admin/instagram/agendar
```json
// Input
{
  "tipo": "imagem",
  "foto_s3_key": "albuns/alb_001/foto_001.jpg",
  "caption": "Sessão no parque 🌿",
  "agendar_para": "2026-07-20T14:00:00Z",
  "album_id": "alb_001",
  "cliente_id": "cli_001"
}

// Response
{
  "post_id": "post_002",
  "status": "agendado",
  "agendar_para": "2026-07-20T14:00:00Z",
  "schedule_arn": "arn:aws:scheduler:..."
}
```

### Fluxo
```
1. Salvar POST_INSTAGRAM com status='agendado'
2. Criar EventBridge Schedule:
   - Nome: ig-post-{post_id}
   - ScheduleExpression: at(2026-07-20T14:00:00)
   - Target: Lambda executarAgendado
   - Input: { post_id, tenant_id }
   - FlexibleTimeWindow: OFF
   - ActionAfterCompletion: DELETE
3. Retornar confirmação
```

### Executar Agendado (Lambda)
```js
async function executarAgendado(event) {
  const { post_id, tenant_id } = event
  const post = await getPost(tenant_id, post_id)
  
  if (post.status !== 'agendado') return // cancelado
  
  try {
    if (post.tipo === 'carrossel') {
      await publicarCarrossel(post)
    } else {
      await publicarPost(post)
    }
    await atualizarPost(post_id, { status: 'publicado', publicado_em: new Date().toISOString() })
  } catch (err) {
    await atualizarPost(post_id, { status: 'falho', erro: err.message })
  }
}
```

### Cancelar Agendamento
```
DELETE /admin/instagram/agendar/:postId
1. Deletar schedule no EventBridge
2. Atualizar POST_INSTAGRAM: status='cancelado'
```

### SAM
```yaml
InstagramSchedulerRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Statement:
        - Effect: Allow
          Principal:
            Service: scheduler.amazonaws.com
          Action: sts:AssumeRole
    Policies:
      - PolicyName: InvokeLambda
        PolicyDocument:
          Statement:
            - Effect: Allow
              Action: lambda:InvokeFunction
              Resource: !GetAtt ExecutarAgendadoFunction.Arn
```

### Frontend
- DateTimePicker para selecionar data/hora
- Fuso horário do admin (converter para UTC)
- Validar: não pode agendar no passado
- Mínimo 15min no futuro
- Preview: "Será publicado em 20/07 às 14:00"
- Botão cancelar na listagem

## Critérios de Aceite
- [ ] Agendar post funciona
- [ ] EventBridge Schedule criado
- [ ] Post publicado na hora certa
- [ ] Cancelar deleta schedule
- [ ] Não agenda no passado
- [ ] Status transição: agendado → publicado/falho
- [ ] Fuso horário correto

## Prompt Pronto para o Kiro CLI

```
Implemente a spec IG-05: Agendamento de Posts.

1. Crie handlers/instagram/agendar.js: criar schedule, salvar post.
2. Crie handlers/instagram/executarAgendado.js: publicar no horário.
3. EventBridge Scheduler: one-time, delete after completion.
4. Cancelar: deletar schedule + status='cancelado'.
5. SAM: role para Scheduler invocar Lambda.
6. Rota: POST/DELETE /admin/instagram/agendar.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
