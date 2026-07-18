# MAP-05: Exibir Distância no Card do Evento (Agenda)

## Metadados
- **ID:** MAP-05
- **Tipo:** Feature
- **Prioridade:** P1
- **Impacto:** Médio
- **Esforço:** Baixo
- **Dependência:** MAP-02, AGD-01

## Contexto
No card do evento na agenda (lista e detalhe), exibir distância (km) e tempo estimado (min) do estúdio até o local. Informação calculada por MAP-02 e armazenada no evento.

## Escopo
- `apps/frontend/src/components/DistanceBadge.jsx` — NOVO
- Modificar: card de evento na agenda para incluir badge

## Fora de Escopo (NÃO TOCAR)
- Cálculo de distância (MAP-02 — já faz)
- Backend (dados já disponíveis no evento)
- Orçamento (MAP-06)

## Spec Técnica

### Componente — DistanceBadge.jsx
```jsx
function DistanceBadge({ distancia_km, duracao_minutos }) {
  if (!distancia_km) return null
  
  return (
    <span className="distance-badge">
      🚗 {distancia_km} km · {duracao_minutos} min
    </span>
  )
}

export default DistanceBadge
```

### Integração no Card do Evento
```jsx
// Dentro do card de evento na agenda
<div className="evento-card">
  <h3>{evento.titulo}</h3>
  <p>📍 {evento.local}</p>
  <DistanceBadge 
    distancia_km={evento.distancia_km} 
    duracao_minutos={evento.duracao_minutos} 
  />
  <MapLink origem={estudio} destino={evento.coordenadas} />
</div>
```

### Quando Calcular
A distância é calculada e salva no evento em 2 momentos:
1. **Ao criar evento** (se endereço informado)
2. **Ao editar endereço do evento**

Isso é responsabilidade da rota de criação/edição de evento (AGD-*), que chama `calcularDistancia()` do MAP-02.

### Estilo
```css
.distance-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #f0f4ff;
  color: #4a6fa5;
  font-size: 12px;
}
```

### Regras
- Se distância não disponível: não exibir (componente retorna null)
- Exibir em km (1 decimal) e minutos (inteiro)
- Estilo: badge azul claro, não-intrusivo
- Posição: abaixo do endereço, acima do link "Abrir no Maps"

## Critérios de Aceite
- [ ] Badge exibe km + minutos
- [ ] Se sem dados: não exibe
- [ ] Estilo coerente com design system
- [ ] Aparece no card da lista
- [ ] Aparece no detalhe do evento

## Prompt Pronto para o Kiro CLI

```
Implemente a spec MAP-05: Distância na Agenda.

1. Crie components/DistanceBadge.jsx: badge km + min.
2. Integrar no card de evento da agenda.
3. Se sem dados: return null.
4. Estilo: badge azul claro, 12px.
5. Posição: abaixo do endereço.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
