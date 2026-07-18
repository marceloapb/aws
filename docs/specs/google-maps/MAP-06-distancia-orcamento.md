# MAP-06: Exibir Distância no Orçamento (ADM)

## Metadados
- **ID:** MAP-06
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** MAP-02, ORC-01

## Contexto
No formulário/detalhe do orçamento (admin), exibir distância e tempo até o local do evento. Serve como referência para precificação (taxa de deslocamento) e logística.

## Escopo
- Reutilizar: `apps/frontend/src/components/DistanceBadge.jsx` (MAP-05)
- Modificar: tela de orçamento para incluir badge + sugestão de taxa

## Fora de Escopo (NÃO TOCAR)
- Cálculo de distância (MAP-02)
- Precificação automática de deslocamento (futuro)
- Agenda (MAP-05)

## Spec Técnica

### Integração na Tela de Orçamento
```jsx
// Seção "Local do Evento" no orçamento
<div className="orcamento-local">
  <h4>Local do Evento</h4>
  <p>📍 {orcamento.local_evento}</p>
  <DistanceBadge 
    distancia_km={orcamento.distancia_km} 
    duracao_minutos={orcamento.duracao_minutos} 
  />
  {orcamento.distancia_km > 30 && (
    <div className="alerta-distancia">
      ⚠️ Distância acima de 30km — considere taxa de deslocamento
    </div>
  )}
  <MapLink origem={estudio} destino={orcamento.coordenadas_evento} />
</div>
```

### Alerta de Distância
| Distância | Comportamento |
|---|---|
| ≤ 30 km | Badge normal (sem alerta) |
| > 30 km | Badge + alerta amarelo |
| > 100 km | Badge + alerta vermelho |

### Quando Calcular
Distância calculada ao:
1. **Preencher endereço do evento no orçamento**
2. **Editar endereço**

Salvar `distancia_km` e `duracao_minutos` na entidade do orçamento.

### Sugestão de Taxa (Info Box)
```jsx
// Se distância > 30km, exibir info box
<InfoBox tipo="aviso">
  💡 Para eventos a mais de 30km, fotógrafos costumam cobrar 
  taxa de deslocamento de R$ 1,00 a R$ 2,00 por km.
  <br />
  Distância: {distancia_km}km → Sugestão: R$ {(distancia_km * 1.5).toFixed(0)}
</InfoBox>
```

### Regras
- Badge aparece se distância disponível
- Alerta amarelo > 30km, vermelho > 100km
- Sugestão de taxa: informativo (não automático)
- Não obrigar fotógrafo a cobrar taxa
- Limiar configurável no futuro (hardcoded 30km por ora)

## Critérios de Aceite
- [ ] Badge no orçamento com km + min
- [ ] Alerta se > 30km
- [ ] Sugestão de taxa (info box)
- [ ] Link "Abrir no Maps"
- [ ] Se sem dados: não exibe

## Prompt Pronto para o Kiro CLI

```
Implemente a spec MAP-06: Distância no Orçamento.

1. Integrar DistanceBadge na tela de orçamento.
2. Alerta amarelo > 30km, vermelho > 100km.
3. Info box com sugestão de taxa (R$/km).
4. MapLink abaixo.
5. Se sem dados: não exibir.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
