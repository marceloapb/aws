# §31 — Programa de Indicações

> Spec no padrão de 10 seções do SISTEMA MBF. Âncora: **§31**.
> Cruza com: §4 Identidade/Conta, §5 Catálogo, §6 Orçamento, §8 Contratos, §21 Pagamentos, §25 Site/Porta de Entrada, §26 Renegociação, §9 Configurações.
> Contexto delimitado: nasce em **Captação** (link + atribuição), premia em **Pagamentos/Financeiro** (desconto), aparece na **Central do Cliente** e no **ADM**.

---

## 1. Objetivo

Transformar clientes satisfeitos em canal de captação, dando desconto pessoal e progressivo a quem indica e desconto de entrada a quem é indicado — sem corroer margem.

---

## 2. Escopo

- Geração de **link pessoal de indicação** por cliente (na Central do Cliente).
- **Atribuição** do indicado ao indicador no cadastro (via porta de entrada §25).
- **Desconto de entrada** para o indicado no primeiro orçamento dele.
- **Desconto acumulado e permanente** para o indicador, que cresce a cada indicação confirmada.
- **Confirmação da indicação no gatilho = assinatura do contrato** do indicado.
- Aplicação dos descontos no orçamento (§6), empilhando com os demais, grampeada pelo desconto máximo do orçamento.
- **Tela do cliente**: acompanhar indicações, ver o próprio %, com aviso de que o desconto é pessoal e intransferível.
- **Tela ADM de listagem**: todas as indicações, status, sinalização de suspeita, ação de revogar.
- **Tela ADM de configuração**: percentuais, incremento, tetos, liga/desliga do programa.

---

## 3. Fora do escopo

- Recompensa em dinheiro/cashback ou crédito em produto — o prêmio é **exclusivamente desconto percentual em contrato futuro** (decisão do PO).
- Consumo/expiração do desconto do indicador — ele é **permanente e não é consumido** (aplica em todo contrato futuro).
- Detecção automática de fraude com bloqueio — o sistema só **sinaliza**; a revogação é **manual pelo ADM**.
- Clawback de contrato já assinado — contratos assinados são imutáveis (§26); revogação afeta apenas contratos futuros.
- Reversão automática de qualquer valor via gateway (§26).
- Multi-nível / indicação em cadeia (indicado do indicado). Apenas **1 nível**.

---

## 4. Atores

- **Cliente indicador** — cliente existente que gera e compartilha o link.
- **Cliente indicado** — pessoa nova que chega pelo link e vira cliente.
- **ADM (BLOISE)** — configura o programa, monitora indicações, revoga irregularidades.
- **Sistema** — atribui indicado→indicador, confirma no gatilho, calcula e aplica descontos, sinaliza suspeitas.

---

## 5. Fluxo principal (caminho feliz)

1. Cliente indicador acessa a Central e obtém seu **link pessoal** (contém um código único vinculado à conta dele).
2. Ele compartilha o link (WhatsApp, etc.).
3. O indicado abre o link → cai na **porta de entrada do orçamento (§25)** com o código embutido.
4. O indicado faz o **cadastro leve** (nome, WhatsApp, e-mail, senha — §25). O sistema grava a **atribuição** (indicado→indicador) e cria uma `Indicacao` com status **pendente**.
5. O indicado segue pro fluxo de orçamento (§6). O sistema aplica o **% base de entrada** como componente de desconto do orçamento dele.
6. O indicado aceita o orçamento e **assina o contrato (§8)**.
7. **Gatilho disparado na assinatura:** a `Indicacao` vira **confirmada**; o desconto acumulado do indicador **soma +incremento**, respeitando o teto de indicação (Cap A).
8. O indicador vê, na Central, a indicação confirmada e o novo % dele.
9. Quando **o próprio indicador** pedir um orçamento futuro, o % acumulado dele entra automaticamente como componente de desconto, empilhado com os demais e grampeado pelo desconto máximo do orçamento (Cap B).

---

## 6. Fluxos alternativos / exceções

- **Indicado não assina:** a `Indicacao` fica **pendente** e nunca confirma. Indicador não ganha nada. O % base que o indicado teria some junto com o orçamento não fechado.
- **Link clicado por conta já existente:** sem atribuição. O programa só vale para **cliente novo** (não existe por e-mail **nem** por WhatsApp — mesma checagem do §25). Indicação não é criada.
- **Auto-indicação (mesmo WhatsApp/conta entre indicador e indicado):** a `Indicacao` é criada mas nasce com **flag de suspeita**; entra na listagem ADM destacada; ADM decide.
- **Irregularidade confirmada pelo ADM:** ADM **revoga** o status do indicador. Efeito: o desconto de indicação **deixa de ser aplicado em contratos futuros**. Contratos já assinados não mudam (§26).
- **Programa desligado no ADM:** links param de atribuir novas indicações; descontos já acumulados continuam válidos (não retroage), salvo revogação individual.
- **Indicado assina e depois cancela:** o crédito do indicador **permanece** (gatilho é a assinatura, não o pagamento). Registrado como resíduo aceito (ver §10).

---

## 7. Regras de negócio

- **Gatilho de confirmação = assinatura do contrato do indicado.** Não é o aceite do orçamento nem o pagamento do sinal.
- **Desconto do indicado:** percentual **base fixo** (`percentual_base_indicado`), aplicado só no **primeiro** orçamento dele. Independe do nível do indicador.
- **Desconto do indicador:** `incremento_por_indicacao` somado **por indicação confirmada**, de forma **linear** ("a cada cliente"). É **pessoal, intransferível, permanente e não consumível** — aplica em todo contrato futuro do indicador.
- **Cap A — teto de indicação:** o % acumulado do indicador **não ultrapassa** `teto_indicacao`. Aplicado no momento da acumulação (indicações que excederiam o teto contam como confirmadas mas não elevam o %).
- **Cap B — desconto máximo do orçamento (§6):** a **soma de todos os descontos** de um orçamento (indicação + à vista + negociação manual do ADM) é grampeada por `desconto_maximo_orcamento`. É o grampo final que protege a margem.
- **Empilhamento:** todos os descontos **somam**; o grampo B é o único limite do total.
- **Atribuição única (first-touch):** um indicado pertence a **exatamente um** indicador — o do primeiro link válido usado no cadastro.
- **Elegibilidade do indicado:** apenas conta **nova** (não duplicada por e-mail nem WhatsApp, §25).
- **Revogação:** manual, só pelo ADM, sobre suspeita sinalizada. Afeta apenas contratos futuros do indicador.
- **Mensagem obrigatória ao cliente:** o desconto é pessoal e intransferível, e irregularidades podem levar à perda dos descontos futuros — exibida na Central.

**Exemplo numérico (para calibrar config e a tela):**
`base_indicado = 5%`, `incremento = 4%/indicação`, `teto_indicacao (A) = 20%`, `desconto_maximo_orcamento (B) = 30%`, à vista = 5%.
- Indicador com 5 indicados confirmados → 5 × 4% = 20% → bate o Cap A, trava em 20% (um 6º indicado confirma, mas não sobe o %).
- Esse indicador fecha novo orçamento à vista, com +8% de negociação sua: 20% + 5% + 8% = 33% → **Cap B corta em 30%**.

---

## 8. Dados (entidades e relações)

**ProgramaIndicacaoConfig** (configuração única por tenant)
- `ativo` (bool)
- `percentual_base_indicado` (%)
- `incremento_por_indicacao` (%)
- `teto_indicacao` (%) — Cap A
- `gatilho` = `assinatura_contrato` (fixo nesta versão)
- *referência (não é dono):* `desconto_maximo_orcamento` vive na config do Orçamento §6 — Cap B.

**CodigoIndicacao** (link pessoal)
- `codigo` (único), `cliente_id` (indicador), `ativo`

**Indicacao** (registro da indicação)
- `id`, `indicador_id`, `indicado_id` (preenchido no cadastro), `codigo_usado`
- `status` ∈ { pendente, confirmada, invalidada }
- `data_cadastro`, `data_confirmacao` (assinatura)
- `flag_suspeita` (bool) + `motivo_suspeita`

**Cliente** (campos novos)
- `desconto_indicacao_acumulado` (%, já grampeado por Cap A)
- `status_programa` ∈ { ativo, revogado }
- `indicado_por` (indicador_id, nullable — first-touch)

**Contrato/Orçamento** (registro dos componentes aplicados)
- `desconto_indicacao`, `desconto_avista`, `desconto_negociacao`, `desconto_total_aplicado` (após grampo B)

**Relações:** Cliente 1—N Indicacao (como indicador) · Cliente 1—1 Indicacao (como indicado) · Indicacao N—1 Cliente(indicador) · Config 1 por tenant.

---

## 9. Critérios de aceite

1. Cliente consegue gerar/copiar um link pessoal único na Central.
2. Indicado que abre o link e se cadastra fica atribuído ao indicador (`indicado_por` gravado) e gera uma `Indicacao` pendente.
3. Conta já existente (por e-mail ou WhatsApp) que abre o link **não** gera atribuição.
4. O % base de entrada aparece no primeiro orçamento do indicado e em nenhum posterior.
5. Ao assinar o contrato, a `Indicacao` vira confirmada e o `desconto_indicacao_acumulado` do indicador sobe pelo incremento, sem ultrapassar o Cap A.
6. Em um orçamento do indicador, indicação + à vista + negociação somam e o total nunca ultrapassa o Cap B.
7. Mesmo WhatsApp entre indicador e indicado gera `flag_suspeita` e aparece destacado na listagem ADM.
8. Revogar um indicador impede a aplicação do desconto dele em novos orçamentos, sem alterar contratos assinados.
9. A Central exibe o aviso de desconto pessoal/intransferível e de perda por irregularidade.
10. Desligar o programa interrompe novas atribuições sem apagar descontos já acumulados.

---

## 10. Dependências e riscos

**Dependências**
- **§6 precisa ter (ou ganhar) o parâmetro `desconto_maximo_orcamento`.** Se ainda não existe, o programa **exige** sua criação — é o Cap B, sem ele a margem fica desprotegida. Campo novo na configuração do orçamento.
- Porta de entrada §25 precisa **ler e propagar o código** do link até o cadastro.
- Checagem de duplicidade e-mail/WhatsApp do §25 é reutilizada para elegibilidade e para a flag de suspeita.
- Evento de **assinatura de contrato (§8)** precisa emitir o gatilho de confirmação.
- Aplicação do desconto no cálculo do orçamento (§6) e registro dos componentes no contrato.

**Riscos**
- **Assinatura sem pagamento credita o indicador** (gatilho = assinatura). Contrato assinado e nunca pago mesmo assim soma +%. Aceito pelo PO.
- **Desconto permanente e não-expirável** cria passivo que nunca envelhece: indicador pesado fica no teto para sempre. Bounded pelos dois tetos, mas perpétuo. Decisão do PO.
- **Fraude por conta duplicada / WhatsApp compartilhado** (riscos já mapeados no §25): mitigado só por sinalização + revogação manual. Depende da disciplina do ADM.
- **Empilhamento sem Cap B** = margem em queda livre. Mitigado pela obrigatoriedade do grampo.
- **First-touch** ignora quem indicou "de verdade" quando há dois links — simplicidade escolhida sobre justiça de atribuição.

---

*Suposição explícita a validar: a resposta "existe para os 2" foi interpretada como dois tetos independentes (Cap A sobre o % de indicação + Cap B do orçamento). Corrigir aqui se o sentido era outro.*
