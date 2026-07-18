# ARC-10 — Meus Dados (Perfil + Foto)

## Metadados
| Campo | Valor |
|-------|-------|
| **ID** | ARC-10 |
| **Tipo** | Feature |
| **Prioridade** | P2 |
| **Impacto** | Médio — cadastro completo, personalização |
| **Esforço** | Baixo |

## Contexto
Tela onde o cliente edita seus dados pessoais: nome, telefone, foto de perfil. E-mail é read-only (vinculado ao Cognito). Foto de perfil via upload direto (presigned URL → S3).

## Escopo
- **Frontend:** `MeusDadosPage.jsx`
- **Lambda:** `getPerfilCliente` — retorna dados do perfil
- **Lambda:** `putPerfilCliente` — atualiza nome, telefone, foto
- **Lambda:** `getUploadUrlPerfil` — gera presigned URL para upload de foto
- **API Gateway:** `GET /cliente/perfil`, `PUT /cliente/perfil`, `GET /cliente/perfil/upload-url`

## Fora de Escopo (NÃO TOCAR)
- Troca de e-mail (requer fluxo Cognito separado)
- Troca de senha (Cognito built-in, link na tela)
- Endereço completo (não necessário para fotógrafo)
- Dados de pagamento (não armazena cartão)

## Spec Técnica

### Lambda getPerfilCliente
- Auth: JWT cliente
- Retorna:
```json
{
  "nome": "Marcelo Alves",
  "email": "marcelo@email.com",
  "telefone": "11999998888",
  "foto_url": "https://cdn.../perfil/abc.jpg",
  "membro_desde": "2026-07-15"
}
```

### Lambda putPerfilCliente
- Auth: JWT cliente
- Body: { nome, telefone, foto_url }
- Valida: nome obrigatório (max 100), telefone formato BR, foto_url (URL válida do S3 do tenant)
- Atualiza DynamoDB PK=CLIENTE#<sub> SK=PROFILE
- Sincroniza nome no Cognito (custom attribute)

### Lambda getUploadUrlPerfil
- Auth: JWT cliente
- Gera presigned PUT para S3: `perfil/{sub}/{timestamp}.jpg`
- Content-Type: image/jpeg ou image/png
- TTL: 5min
- Max size: 5MB (validado no presigned)

### Estrutura da Página
```
<MeusDadosPage>
  <FotoPerfil>
    - Avatar circular (ou iniciais se sem foto)
    - Botão "Trocar foto" → upload
    - Preview antes de salvar
  </FotoPerfil>
  <Formulario>
    - Nome (editável)
    - E-mail (read-only, com ícone cadeado)
    - Telefone (editável, máscara BR)
    - Link "Alterar senha" → Cognito forgot-password
  </Formulario>
  <BotaoSalvar>
    - "Salvar alterações" (disabled se nada mudou)
  </BotaoSalvar>
</MeusDadosPage>
```

## Critérios de Aceite
- Nome e telefone editáveis, e-mail read-only
- Foto: upload funciona, preview antes de salvar
- Foto: max 5MB, só jpeg/png
- Salvar disabled se nenhuma alteração
- Validação: nome obrigatório, telefone formato BR
- "Alterar senha" redireciona para fluxo Cognito

## Prompt Pronto para o Kiro CLI
```
Implemente a spec ARC-10 (Meus Dados — Perfil + Foto).

Crie:
1. src/functions/cliente/getPerfilCliente/index.mjs — retorna dados do perfil
2. src/functions/cliente/putPerfilCliente/index.mjs — atualiza nome/telefone/foto
3. src/functions/cliente/getUploadUrlPerfil/index.mjs — presigned PUT para S3 (5MB, jpeg/png)
4. Rotas GET/PUT /cliente/perfil e GET /cliente/perfil/upload-url no template.yaml
5. src/pages/cliente/MeusDadosPage.jsx — avatar + formulário + upload

Upload: presigned URL S3, path perfil/{sub}/{ts}.jpg, TTL 5min, max 5MB.
E-mail read-only. Nome sincroniza com Cognito custom attribute.
Botão salvar disabled se sem alterações.

IMPORTANTE: altere SOMENTE os arquivos listados acima. Não refatore, renomeie ou mexa em mais nada.
```
