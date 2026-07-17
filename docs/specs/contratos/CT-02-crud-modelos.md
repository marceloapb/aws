# CT-02: CRUD Modelos de Contrato

## Metadados
- **ID:** CT-02
- **Tipo:** Feature
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Médio
- **Dependência:** CT-01

## Contexto
O admin cria e gerencia modelos (templates) de contrato com variáveis interpoláveis e campos manuais. Cada modelo tem um corpo HTML com placeholders tipo {{nome_cliente}}, {{valor_total}}. O modelo é reutilizado toda vez que um contrato é gerado.

## Escopo
- `apps/backend/src/handlers/contratos/modelos.js` — NOVO
- `apps/frontend/src/pages/admin/ContratosModelos.jsx` — NOVO
- `apps/frontend/src/pages/admin/ModeloContratoForm.jsx` — NOVO
- API: /admin/contratos/modelos (CRUD)

## Fora de Escopo (NÃO TOCAR)
- Geração de contrato (CT-03)
- Aceite (CT-05)
- Orçamentos (módulo ORC)

## Spec Técnica

### API
| Método | Rota | Ação |
|---|---|---|
| GET | /admin/contratos/modelos | Listar |
| GET | /admin/contratos/modelos/:id | Buscar |
| POST | /admin/contratos/modelos | Criar |
| PUT | /admin/contratos/modelos/:id | Atualizar |
| DELETE | /admin/contratos/modelos/:id | Deletar |

### Variáveis Disponíveis (auto-preenchidas)
| Variável | Fonte | Exemplo |
|---|---|---|
| {{nome_cliente}} | Cliente | Ana Carolina Silva |
| {{cpf_cliente}} | Cliente | 123.456.789-00 |
| {{email_cliente}} | Cliente | ana@email.com |
| {{telefone_cliente}} | Cliente | (11) 99999-8888 |
| {{tipo_evento}} | Orçamento | Casamento |
| {{data_evento}} | Orçamento | 15/08/2026 |
| {{local_evento}} | Orçamento | Espaço Villa |
| {{valor_total}} | Orçamento | R$ 4.500,00 |
| {{forma_pagamento}} | Orçamento | 3x R$ 1.500,00 |
| {{prazo_entrega}} | Orçamento | 45 dias |
| {{servicos_contratados}} | Orçamento | Cobertura 8h + Álbum 30x30 |
| {{nome_fotografo}} | Tenant | Marcelo APB |
| {{cnpj_fotografo}} | Tenant | 12.345.678/0001-00 |
| {{data_hoje}} | Sistema | 17/07/2026 |

### Campos Manuais (admin preenche na geração)
- `observacoes_adicionais` — Texto livre
- `clausula_especial` — Cláusula extra negociada
- `local_assinatura` — Cidade do contrato

### Frontend — ModeloContratoForm.jsx
- **Editor HTML** (rich text) para o corpo do contrato
- **Sidebar:** Lista de variáveis disponíveis (clicar insere no cursor)
- **Preview:** Renderização com dados fictícios
- **Campos:**
  - Nome do modelo
  - Descrição
  - Prazo de assinatura (dias)
  - Corpo HTML
  - Campos manuais (adicionar/remover)
- **Versionamento:** Ao editar, incrementa versão (contratos já gerados mantêm versão anterior)

### Modelo Seed (pré-configurado)
```html
<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS</h1>
<p>Pelo presente instrumento particular, de um lado <strong>{{nome_fotografo}}</strong>, inscrito no CNPJ {{cnpj_fotografo}}, doravante denominado CONTRATADO, e de outro lado <strong>{{nome_cliente}}</strong>, inscrito no CPF {{cpf_cliente}}, doravante denominado CONTRATANTE...</p>
<h2>CLÁUSULA 1 — DO OBJETO</h2>
<p>O presente contrato tem como objeto a prestação de serviços fotográficos para o evento <strong>{{tipo_evento}}</strong>, a ser realizado em <strong>{{data_evento}}</strong>, no local <strong>{{local_evento}}</strong>.</p>
<h2>CLÁUSULA 2 — DOS SERVIÇOS</h2>
<p>{{servicos_contratados}}</p>
<h2>CLÁUSULA 3 — DO VALOR E PAGAMENTO</h2>
<p>O valor total dos serviços é de <strong>{{valor_total}}</strong>, a ser pago da seguinte forma: {{forma_pagamento}}.</p>
<h2>CLÁUSULA 4 — DA ENTREGA</h2>
<p>O prazo de entrega do material final será de {{prazo_entrega}} após a data do evento.</p>
```

## Critérios de Aceite
- [ ] CRUD de modelos funciona
- [ ] Editor HTML com inserção de variáveis
- [ ] Preview com dados fictícios
- [ ] Versionamento (editar incrementa)
- [ ] Modelo seed criado
- [ ] Campos manuais configuráveis
- [ ] Prazo de assinatura por modelo

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CT-02: CRUD Modelos de Contrato.

1. Crie handlers/contratos/modelos.js: CRUD completo.
2. Crie pages/admin/ContratosModelos.jsx: listagem.
3. Crie pages/admin/ModeloContratoForm.jsx: editor HTML + variáveis.
4. Sidebar de variáveis clicáveis.
5. Preview com dados fictícios.
6. Versionamento ao editar.
7. Modelo seed pré-configurado.
8. SAM: rotas CRUD.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
