# UX-02 — Tela de Configurações — Layout e Hierarquia Visual (P1)

| Campo | Valor |
|-------|-------|
| **ID** | UX-02 |
| **Tipo** | Correção UX |
| **Título** | Reorganizar Configurações com hierarquia visual clara |
| **Prioridade** | P1 |
| **Impacto** | Médio — primeiro contato do fotógrafo com o sistema |
| **Esforço** | Baixo |

---

## Contexto

A tela de Configurações apresenta todos os campos com o mesmo peso visual, sem separação conceitual. Campos cadastrais (Razão Social) estão misturados com regras de negócio (Prazo de entrega). Não há indicação de obrigatoriedade, validação inline, ou feedback de salvamento.

Impacto real: fotógrafo preenche parcialmente, não entende a importância de cada campo, abandona configuração incompleta.

---

## Escopo

### Arquivos a ALTERAR
- `apps/frontend/src/components/ConfigDadosEmpresa.js` — reorganizar campos
- `apps/frontend/src/pages/admin/ConfigEmpresa.jsx` — adicionar indicadores visuais

### Arquivos a CRIAR
- `apps/frontend/src/components/config/SectionHeader.jsx` — header de seção
- `apps/frontend/src/components/config/FieldLabel.jsx` — label com obrigatório
- `apps/frontend/src/components/config/ProgressBar.jsx` — progresso de preenchimento
- `apps/frontend/src/components/config/AutoSaveIndicator.jsx` — indicador de salvamento

---

## Spec Técnica

### Reorganização por Seções

**Seção 1 — Identidade (header: "Sua Empresa")**
- Upload de logo (preview circular, crop, formatos: jpg/png/webp, max 2MB)
- Razão Social * (obrigatório)
- Nome Fantasia * (obrigatório)
- CNPJ/CPF * (obrigatório, validação inline com máscara)

**Seção 2 — Contato (header: "Como te encontram")**
- Telefone (máscara)
- WhatsApp Business * (separado do telefone — integração crítica)
- E-mail * (validação formato)
- Instagram (@handle)
- Site/URL

**Seção 3 — Localização (header: "Endereço")**
- CEP (auto-fill cidade/estado/rua via ViaCEP)
- Endereço (preenchido automaticamente, editável)
- Número + Complemento (mesma linha)
- Bairro
- Cidade + Estado (readonly se veio do CEP)
- Botão "Usar minha localização" (GPS)

**Seção 4 — Regras de Negócio (header: "Padrões do seu trabalho")**
- Prazo padrão de entrega (dias)
- Condição de pagamento padrão (select)
- Desconto máximo permitido (%)
- Validade padrão de orçamentos (dias)
- Horário comercial (início/fim)
- Antecedência mínima para agendamento (dias)

### Indicadores Visuais

**Campo obrigatório (FieldLabel.jsx):**
- Asterisco vermelho + tooltip "Obrigatório"
- Borda vermelha se vazio ao tentar salvar
- Borda verde se preenchido e válido

**Validação inline:**
- CNPJ: valida dígitos ao sair do campo
- E-mail: regex ao sair do campo
- CEP: busca automática ao completar 8 dígitos
- Feedback: ícone check verde ou X vermelho ao lado

**Progresso de preenchimento (ProgressBar.jsx):**
- Barra no topo: "Seu perfil está X% completo"
- Cores: vermelho (<40%), amarelo (40-70%), verde (>70%)
- Tooltip nos campos faltantes ao hover na barra

**Auto-save (AutoSaveIndicator.jsx):**
- Debounce de 2s após última edição
- Indicador no header: "Salvando..." > "Salvo" > fade
- Se falha: "Erro ao salvar — Tentar novamente" (retry button)
- Alterações não salvas: alerta ao tentar sair da página

### Sticky Save Button
- Em telas onde scroll é necessário: botão "Salvar" fixo no bottom
- Aparece somente quando há alterações não salvas
- Em mobile: full-width, 56px height

---

## Fora de Escopo (NÃO TOCAR)
- `apps/api/` — backend
- `template.yaml`, `infra/`
- Outras abas de configuração (já cobertas pela SPEC-37)
- Outras pages

---

## Critérios de Aceite
1. Campos organizados em 4 seções com headers visuais
2. Upload de logo funciona com preview
3. Campo WhatsApp Business separado do telefone
4. CEP auto-preenche endereço
5. Validação inline com feedback visual
6. Barra de progresso calcula % preenchido
7. Auto-save com indicador funciona
8. Sticky button aparece ao scrollar

---

## Prompt Pronto para o Kiro CLI

```
Implemente a UX-02 conforme docs/specs/UX-02-configuracoes-hierarquia.md.

Reorganize ConfigDadosEmpresa.js em 4 seções com headers visuais.
Adicione: upload de logo, campo WhatsApp separado, validação inline, auto-fill CEP, barra de progresso, auto-save com indicador, sticky save button.

Arquivos a criar:
- apps/frontend/src/components/config/SectionHeader.jsx
- apps/frontend/src/components/config/FieldLabel.jsx
- apps/frontend/src/components/config/ProgressBar.jsx
- apps/frontend/src/components/config/AutoSaveIndicator.jsx

Arquivos a alterar:
- apps/frontend/src/components/ConfigDadosEmpresa.js
- apps/frontend/src/pages/admin/ConfigEmpresa.jsx

NÃO TOQUE em nenhum arquivo fora dessa lista.
```
