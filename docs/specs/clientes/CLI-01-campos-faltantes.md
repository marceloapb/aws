# CLI-01: Campos Faltantes no Formulário de Cliente

## Metadados
- **ID:** CLI-01
- **Tipo:** Correção
- **Prioridade:** P0
- **Impacto:** Alto
- **Esforço:** Baixo
- **Dependência:** Nenhuma

## Contexto
O `ClienteForm.jsx` (14.3KB) tem campos básicos (nome, email, telefone) mas falta: CPF/CNPJ com validação, endereço completo com busca por CEP, redes sociais (Instagram, WhatsApp), data de nascimento, e campo "como conheceu".

## Escopo
- `apps/frontend/src/pages/admin/ClienteForm.jsx` — adicionar campos
- Backend: Lambda createCliente/updateCliente — aceitar novos campos
- DynamoDB: atributos adicionais no item CLIENTE

## Fora de Escopo (NÃO TOCAR)
- `Clientes.jsx` (listagem)
- `ClienteDetalhe.jsx` (detalhe)
- Qualquer outro módulo

## Spec Técnica

### Campos a Adicionar
| Campo | Tipo | Validação | Obrigatório |
|---|---|---|---|
| cpf_cnpj | string | Validar CPF (11 dígitos) ou CNPJ (14 dígitos) | Não |
| data_nascimento | date | Formato ISO, não futuro | Não |
| instagram | string | Remover @ se presente, lowercase | Não |
| whatsapp | string | Formato +55XXXXXXXXXXX | Não |
| endereco.cep | string | 8 dígitos, busca via ViaCEP | Não |
| endereco.logradouro | string | Auto-fill do CEP | Não |
| endereco.numero | string | — | Não |
| endereco.complemento | string | — | Não |
| endereco.bairro | string | Auto-fill do CEP | Não |
| endereco.cidade | string | Auto-fill do CEP | Não |
| endereco.estado | string | 2 chars UF | Não |
| como_conheceu | enum | instagram, indicacao, google, site, outro | Não |
| notas | string | Max 500 chars | Não |

### Busca CEP (ViaCEP)
```js
const buscarCEP = async (cep) => {
  const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  const data = await resp.json()
  if (!data.erro) {
    setForm(prev => ({
      ...prev,
      endereco: {
        ...prev.endereco,
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf
      }
    }))
  }
}
```

### Validação CPF
```js
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  let soma = 0, resto
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf[i-1]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf[9])) return false
  soma = 0
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf[i-1]) * (12 - i)
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  return resto === parseInt(cpf[10])
}
```

## Critérios de Aceite
- [ ] CPF/CNPJ com máscara e validação
- [ ] Busca CEP preenche endereço automaticamente
- [ ] Instagram salvo sem @
- [ ] WhatsApp com máscara de telefone
- [ ] Data nascimento não aceita data futura
- [ ] Campo "como conheceu" com dropdown
- [ ] Campos novos salvam e carregam corretamente
- [ ] Formulário existente continua funcionando

## Prompt Pronto para o Kiro CLI

```
Implemente a spec CLI-01: Campos Faltantes no Formulário de Cliente.

1. Em ClienteForm.jsx: adicionar campos CPF/CNPJ, data_nascimento, instagram, whatsapp, endereço completo (com busca CEP via ViaCEP), como_conheceu, notas.
2. Validação: CPF/CNPJ (algoritmo), CEP (8 dígitos), data não-futura.
3. Máscaras: CPF (999.999.999-99), CNPJ (99.999.999/9999-99), CEP (99999-999), telefone.
4. Backend: aceitar novos campos no createCliente/updateCliente.

Altere SOMENTE os arquivos listados. Não refatore, renomeie ou mexa em mais nada.
```
