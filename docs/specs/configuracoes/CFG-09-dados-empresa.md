# CFG-09: Dados da Empresa — Formulário completo

## Metadados
- **ID:** CFG-09
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** Nenhuma

## Contexto
A aba "Dados da Empresa" é a primeira coisa que o fotógrafo configura no onboarding. Precisa conter: dados do estúdio (nome, CNPJ/CPF, endereço, telefone, email), logo, cores da marca, redes sociais, e dados bancários para recebimento.

## Escopo
- `apps/frontend/src/pages/admin/Configuracoes/DadosEmpresa.jsx` — NOVO ou expandir existente
- `apps/api/src/routes/admin-configuracoes.js` — GET/PUT /configuracoes/empresa
- DynamoDB: entidade CONFIG#EMPRESA

## Fora de Escopo (NÃO TOCAR)
- Upload de logo para S3 (usar SPEC-10 presigned URL já pronta)
- Integrações (WhatsApp, Instagram, etc.)
- Gateway de pagamento
- Outros módulos

## Spec Técnica

### Campos
| Seção | Campo | Tipo | Obrigatório |
|---|---|---|---|
| Identificação | Nome Fantasia | text | Sim |
| Identificação | Razão Social | text | Não |
| Identificação | CPF/CNPJ | text (mask) | Sim |
| Identificação | Inscrição Estadual | text | Não |
| Contato | Telefone | text (mask) | Sim |
| Contato | Email de contato | email | Sim |
| Contato | Email financeiro | email | Não |
| Endereço | CEP | text (autocomplete ViaCEP) | Sim |
| Endereço | Logradouro | text | Sim |
| Endereço | Número | text | Sim |
| Endereço | Complemento | text | Não |
| Endereço | Bairro | text | Sim |
| Endereço | Cidade | text | Sim |
| Endereço | Estado | select (UFs) | Sim |
| Marca | Logo | file (upload S3) | Não |
| Marca | Cor primária | color picker | Não |
| Marca | Cor secundária | color picker | Não |
| Redes | Instagram | text | Não |
| Redes | Facebook | text | Não |
| Redes | Website | url | Não |
| Bancário | Banco | text | Não |
| Bancário | Agência | text | Não |
| Bancário | Conta | text | Não |
| Bancário | Tipo conta | select | Não |
| Bancário | Chave Pix | text | Não |

### API
| Método | Path | Descrição |
|---|---|---|
| GET | /admin/configuracoes/empresa | Retorna dados da empresa |
| PUT | /admin/configuracoes/empresa | Atualiza dados |

### DynamoDB
```
PK: TENANT#<id>
SK: CONFIG#EMPRESA
attributes: nome_fantasia, razao_social, cpf_cnpj, ie, telefone, email_contato, email_financeiro, endereco{}, marca{}, redes{}, dados_bancarios{}, updated_at
```

## Critérios de Aceite
- [ ] Formulário com todas as seções e campos da tabela
- [ ] Máscara de CPF/CNPJ (detecta automaticamente)
- [ ] CEP com autocomplete (ViaCEP)
- [ ] Upload de logo funciona (presigned URL)
- [ ] Color picker para cores da marca
- [ ] Validação de email e campos obrigatórios
- [ ] Salvar persiste no DynamoDB

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CFG-09: Dados da Empresa — Formulário completo.

1. Crie/expanda apps/frontend/src/pages/admin/Configuracoes/DadosEmpresa.jsx:
   - Formulário dividido em seções: Identificação, Contato, Endereço, Marca, Redes, Dados Bancários
   - Máscara CPF/CNPJ (react-input-mask ou manual)
   - CEP autocomplete via fetch https://viacep.com.br/ws/{cep}/json/
   - Upload de logo via presigned URL (usar hook existente se houver)
   - Color picker para cor primária/secundária
   - Select de UFs brasileiros
   - Botão Salvar chama PUT /admin/configuracoes/empresa

2. Backend em admin-configuracoes.js:
   - GET /admin/configuracoes/empresa → DynamoDB Query PK=TENANT#id, SK=CONFIG#EMPRESA
   - PUT /admin/configuracoes/empresa → validação + update

3. DynamoDB: PK TENANT#<id>, SK CONFIG#EMPRESA com nested objects.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
