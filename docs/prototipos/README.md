# Protótipos de Referência

## Origem

Todos os protótipos de UI estão no repositório **[marceloapb/sistema-mbf](https://github.com/marceloapb/sistema-mbf)** na pasta `prototipos/`.

Este é o repositório de especificações e design do sistema MBF. Os protótipos são componentes React/JSX completos que definem a UI esperada de cada tela.

---

## Como copiar para cá (uma vez)

```bash
# Dentro do diretório raiz do repo aws (já clonado)
git remote add sistema-mbf https://github.com/marceloapb/sistema-mbf.git
git fetch sistema-mbf
git checkout sistema-mbf/main -- prototipos/
mv prototipos/* docs/prototipos/
rm -rf prototipos
git add docs/prototipos/
git commit -m "feat: importar protótipos do sistema-mbf como referência"
git push origin main
git remote remove sistema-mbf
```

---

## Inventário de Protótipos (39 arquivos, ~650KB)

### Área Admin

| Arquivo | Tamanho | Spec Relacionada |
|---------|---------|------------------|
| `agenda-prototipo.jsx` | 14.7 KB | Agenda (existente) |
| `agenda-listagem-prototipo.jsx` | 14.6 KB | Agenda (existente) |
| `album-gestao-prototipo.jsx` | 44.0 KB | SPEC-42 |
| `album-organizar-fotos-prototipo.jsx` | 14.4 KB | SPEC-42 |
| `album-tema-vitrine-prototipo.jsx` | 22.7 KB | SPEC-42 |
| `area-admin-prototipo.jsx` | 10.8 KB | Layout geral admin |
| `backup-sistema-prototipo.jsx` | 15.1 KB | SPEC-37 (aba Backup) |
| `cargas-cadastro-prototipo.jsx` | 13.6 KB | SPEC-50 (Import) |
| `catalogo-prototipo.jsx` | 42.2 KB | SPEC-41 |
| `cobranca-experiencia-prototipo.jsx` | 16.3 KB | SPEC-44 |
| `contrato-prototipo.jsx` | 26.5 KB | SPEC-39 |
| `dados-empresa-prototipo.jsx` | 9.8 KB | SPEC-37 |
| `editar-orcamento-prototipo.jsx` | 15.9 KB | SPEC-38 |
| `feedback-prototipo.jsx` | 11.6 KB | SPEC-45 |
| `financeiro-caixa-prototipo.jsx` | 33.5 KB | SPEC-40 |
| `followup-motor-prototipo.jsx` | 21.5 KB | SPEC-51 (Pendências) |
| `gateways-pagamento-prototipo.jsx` | 20.1 KB | SPEC-37/44 |
| `instagram-central-prototipo.jsx` | 12.1 KB | SPEC-48 |
| `instagram-publicar-prototipo.jsx` | 8.1 KB | SPEC-48 |
| `instagram-story-ia-prototipo.jsx` | 20.5 KB | SPEC-48 (futuro) |
| `inventario-checklist-prototipo.jsx` | 40.6 KB | SPEC-47 |
| `mensagens-comentarios-prototipo.jsx` | 15.9 KB | SPEC-44 (WhatsApp) |
| `nota-fiscal-prototipo.jsx` | 20.7 KB | SPEC-46 |
| `notificacoes-prototipo.jsx` | 13.9 KB | SPEC-51 |
| `novidades-admin-prototipo.jsx` | 17.1 KB | Futuro |
| `orcamento-completo-prototipo.jsx` | 50.6 KB | SPEC-38 |
| `pagamento-controle-prototipo.jsx` | 16.1 KB | SPEC-44 |
| `pesquisa-recusa-prototipo.jsx` | 13.6 KB | SPEC-38 |
| `portfolio-admin-prototipo.jsx` | 14.0 KB | Futuro |
| `renegociacao-aditivo-prototipo.jsx` | 20.8 KB | SPEC-49 |
| `sistema-mbf-consolidado.jsx` | 50.9 KB | Referência geral |

### Área do Cliente

| Arquivo | Tamanho | Spec Relacionada |
|---------|---------|------------------|
| `album-vitrine-cliente-prototipo.jsx` | 20.0 KB | SPEC-53 |
| `central-cliente-prototipo.jsx` | 32.5 KB | SPEC-53 |
| `novidades-publico-prototipo.jsx` | 5.5 KB | Futuro |

### Site Público

| Arquivo | Tamanho | Spec Relacionada |
|---------|---------|------------------|
| `site-cinematografico-navegavel-prototipo.jsx` | 21.5 KB | Site público |
| `site-cms-prototipo.jsx` | 12.1 KB | Site público (CMS) |
| `site-publico-prototipo.jsx` | 17.2 KB | Site público |
| `whatsapp-conexao-templates-prototipo.jsx` | 20.0 KB | SPEC-44 |
| `whatsapp-conversas-log-prototipo.jsx` | 25.4 KB | SPEC-44 |

---

## Como usar com o Kiro CLI

No prompt de cada spec, referencie o protótipo correspondente:

```
Siga o protótipo em docs/prototipos/orcamento-completo-prototipo.jsx como referência visual e funcional.
O protótipo define a UI completa esperada — componentes, layouts, states e interações.
Adapte para conectar com as APIs reais (não use dados mockados do protótipo).
```

### Regras ao usar protótipos como referência:

1. **UI/UX**: Seguir fielmente layout, componentes, fluxos e interações do protótipo
2. **Dados**: Substituir dados mockados por chamadas à API real (endpoints listados na spec)
3. **Componentes**: Extrair componentes reutilizáveis conforme a estrutura definida na spec
4. **Estado**: Adaptar state management para usar React Query ou SWR com a API
5. **Estilo**: Manter o design system (Tailwind + cores do tema) do protótipo

---

## Mapeamento Spec → Protótipo(s)

| Spec | Protótipos de Referência |
|------|-------------------------|
| SPEC-37 | `dados-empresa-prototipo.jsx`, `backup-sistema-prototipo.jsx`, `gateways-pagamento-prototipo.jsx` |
| SPEC-38 | `orcamento-completo-prototipo.jsx`, `editar-orcamento-prototipo.jsx`, `pesquisa-recusa-prototipo.jsx` |
| SPEC-39 | `contrato-prototipo.jsx` |
| SPEC-40 | `financeiro-caixa-prototipo.jsx` |
| SPEC-41 | `catalogo-prototipo.jsx` |
| SPEC-42 | `album-gestao-prototipo.jsx`, `album-organizar-fotos-prototipo.jsx`, `album-tema-vitrine-prototipo.jsx` |
| SPEC-43 | — (sem protótipo dedicado, usar padrão geral de `area-admin-prototipo.jsx`) |
| SPEC-44 | `cobranca-experiencia-prototipo.jsx`, `pagamento-controle-prototipo.jsx`, `whatsapp-conexao-templates-prototipo.jsx`, `whatsapp-conversas-log-prototipo.jsx`, `mensagens-comentarios-prototipo.jsx` |
| SPEC-45 | `feedback-prototipo.jsx` |
| SPEC-46 | `nota-fiscal-prototipo.jsx` |
| SPEC-47 | `inventario-checklist-prototipo.jsx` |
| SPEC-48 | `instagram-central-prototipo.jsx`, `instagram-publicar-prototipo.jsx` |
| SPEC-49 | `renegociacao-aditivo-prototipo.jsx` |
| SPEC-50 | `cargas-cadastro-prototipo.jsx` |
| SPEC-51 | `followup-motor-prototipo.jsx`, `notificacoes-prototipo.jsx` |
| SPEC-52 | — (tela simples, usar padrão geral) |
| SPEC-53 | `central-cliente-prototipo.jsx`, `album-vitrine-cliente-prototipo.jsx` |

---

## Nota Importante

Os arquivos `.jsx` nesta pasta são **apenas referência visual/funcional**. NÃO devem ser importados diretamente no build. Servem como "blueprint" para o Kiro CLI implementar as telas reais em `apps/frontend/src/`.
