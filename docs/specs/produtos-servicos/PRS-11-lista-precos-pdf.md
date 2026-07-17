# PRS-11: Gerar Lista de Preços (PDF)

## Metadados
- **ID:** PRS-11
- **Tipo:** Feature
- **Prioridade:** P2
- **Impacto:** Médio
- **Esforço:** Médio
- **Dependência:** PRS-03, PRS-07

## Contexto
O admin gera um PDF com a lista de preços para enviar a clientes interessados. Inclui apenas itens/pacotes com `exibir_ao_cliente=true`. Branding do fotógrafo (logo, cores, contato).

## Escopo
- `apps/backend/src/handlers/produtos/listaPrecos.js` — NOVO
- API: GET /admin/produtos/lista-precos (retorna PDF ou presigned URL)
- Template PDF

## Fora de Escopo (NÃO TOCAR)
- CRUD de itens/pacotes
- Orçamentos
- Frontend complexo (é um botão "Gerar PDF")

## Spec Técnica

### Fluxo
```
1. Admin clica "Gerar Lista de Preços"
2. Lambda busca itens + pacotes com exibir_ao_cliente=true e ativo=true
3. Agrupa por categoria
4. Gera PDF com branding
5. Upload para S3 (temp, TTL 24h)
6. Retorna presigned URL
```

### Estrutura do PDF
```
[Logo + Nome do Estúdio]
[Contato: email, telefone, Instagram]

--- Fotografia ---
• Cobertura Casamento — a partir de R$ 3.500 (8h incluídas)
• Ensaio Externo — R$ 1.200 (2h incluídas)

--- Vídeo ---
• Filmagem Casamento — a partir de R$ 2.800

--- Pacotes ---
• Pacote Casamento Completo — R$ 4.950 (10% off)
  Inclui: Cobertura + Álbum + Making Of

--- Extras ---
• Hora Extra — R$ 250/h
• Drone — R$ 500

[Rodapé: "Valores sujeitos a alteração. Consulte-nos."]
[Data de geração]
```

### Regras
- Apenas `exibir_ao_cliente=true` e `ativo=true`
- Agrupado por categoria (ordem da categoria)
- Serviços com duração: "a partir de R$ X (Yh incluídas)"
- Pacotes: mostrar desconto e itens incluídos
- Branding: buscar de ConfigEmpresa (logo, nome, cores, contato)

### Geração PDF
- Biblioteca: PDFKit ou html-pdf (Lambda layer)
- Upload S3: `{tenant_id}/temp/lista-precos-{timestamp}.pdf`
- TTL: presigned URL com expiração 24h
- Alternativa: gerar no frontend com jsPDF (client-side)

## Critérios de Aceite
- [ ] PDF gerado com itens/pacotes visíveis
- [ ] Agrupamento por categoria
- [ ] Branding do fotógrafo
- [ ] Pacotes com desconto e composição
- [ ] Serviços com "a partir de"
- [ ] URL para download
- [ ] Apenas exibir_ao_cliente=true

## Prompt Pronto para o Kiro CLI

```
Implemente a spec PRS-11: Gerar Lista de Preços (PDF).

1. Crie handlers/produtos/listaPrecos.js: buscar itens/pacotes visíveis, gerar PDF.
2. Agrupar por categoria, aplicar branding (ConfigEmpresa).
3. Upload S3 temp + presigned URL 24h.
4. Rota: GET /admin/produtos/lista-precos.
5. Lambda Layer com PDFKit (ou jsPDF no frontend).

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
