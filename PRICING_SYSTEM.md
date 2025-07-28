# Sistema de Precificação Individual por Jogador

## Visão Geral

O sistema implementa uma lógica de cobrança **individual por jogador**, identificado pelo CPF, que calcula preços de forma cumulativa em todas as inscrições (independente de campeonato ou categoria).

## Regras de Cobrança

### Estrutura de Preços
- **Valor Base**: R$ 30,00 para a primeira inscrição do jogador (em qualquer campeonato/categoria)
- **Valor Adicional**: R$ 10,00 para cada inscrição adicional do mesmo jogador

### Fórmula de Cálculo
```
valor_total_jogador = valor_base + (quantidade_inscricoes_adicionais * valor_adicional)
```

### Exemplos Práticos

#### Exemplo 1: Jogador Novo
- **João (CPF: 123.456.789-01)** nunca se inscreveu antes
- Se inscreve em **2 categorias** em um campeonato
- **Cálculo**: R$ 30,00 + (1 × R$ 10,00) = **R$ 40,00**

#### Exemplo 2: Jogador com Histórico
- **Maria (CPF: 987.654.321-02)** já tem **3 inscrições** anteriores
- Se inscreve em **1 nova categoria**
- **Cálculo**: R$ 10,00 (4ª inscrição) = **R$ 10,00**

#### Exemplo 3: Dupla Mista
- **Carlos (CPF: 111.222.333-44)**: 0 inscrições anteriores
- **Ana (CPF: 555.666.777-88)**: 2 inscrições anteriores  
- Se inscrevem juntos na categoria **Misto**
- **Cálculo**:
  - Carlos: R$ 30,00 (primeira inscrição)
  - Ana: R$ 10,00 (terceira inscrição)
  - **Total da dupla**: R$ 40,00

## Endpoints da API

### 1. Validar CPF
```http
POST /api/validate-cpf
Content-Type: application/json

{
  "cpf": "123.456.789-01"
}
```

**Resposta:**
```json
{
  "isValid": true,
  "cpf": "12345678901",
  "totalRegistrations": 2,
  "registrationHistory": [
    {
      "tournamentName": "Campeonato de Verão 2025",
      "category": "X1",
      "registeredAt": "2025-01-15T10:30:00.000Z",
      "playerType": "main"
    }
  ],
  "message": "CPF válido - 2 inscrição(ões) anterior(es)"
}
```

### 2. Calcular Preço Antes da Inscrição
```http
POST /api/tournaments/{tournamentId}/calculate-price
Content-Type: application/json

{
  "player1": {
    "name": "João Silva",
    "cpf": "123.456.789-01"
  },
  "categories": ["X1", "X2"],
  "partners": {
    "X2": {
      "name": "Maria Santos",
      "cpf": "987.654.321-02"
    }
  }
}
```

**Resposta:**
```json
{
  "tournament": {
    "id": "uuid-tournament",
    "name": "Campeonato de Verão 2025",
    "baseCategoryPrice": 30,
    "additionalCategoryPrice": 10
  },
  "calculations": [
    {
      "playerType": "main",
      "cpf": "12345678901",
      "name": "João Silva",
      "categories": ["X1", "X2"],
      "existingRegistrations": 0,
      "newRegistrationsPrice": 40,
      "totalPrice": 40
    },
    {
      "playerType": "partner",
      "cpf": "98765432102",
      "name": "Maria Santos",
      "categories": ["X2"],
      "existingRegistrations": 2,
      "newRegistrationsPrice": 10,
      "totalPrice": 10
    }
  ],
  "totalPrice": 50
}
```

### 3. Realizar Inscrição
```http
POST /api/tournaments/{tournamentId}/register
Content-Type: application/json

{
  "player1": {
    "name": "João Silva",
    "cpf": "123.456.789-01",
    "email": "joao@email.com",
    "phone": "(11) 99999-9999"
  },
  "categories": ["X1", "X2"],
  "partners": {
    "X2": {
      "name": "Maria Santos",
      "cpf": "987.654.321-02",
      "email": "maria@email.com",
      "phone": "(11) 88888-8888"
    }
  }
}
```

### 4. Relatório de Precificação
```http
GET /api/reports/pricing
```

**Resposta:**
```json
{
  "summary": {
    "totalPlayers": 150,
    "totalRegistrations": 320,
    "totalRevenue": 4200,
    "averageRevenuePerPlayer": "28.00",
    "playersWithMultipleRegistrations": 85
  },
  "players": [
    {
      "cpf": "12345678901",
      "name": "João Silva",
      "totalRegistrations": 5,
      "totalPrice": 70,
      "registrations": [
        {
          "tournamentName": "Campeonato de Verão",
          "category": "X1",
          "registrationOrder": 1,
          "price": 30,
          "isFirstRegistration": true
        }
      ]
    }
  ]
}
```

## Estrutura de Dados

### Jogadores (players.json)
```json
[
  {
    "cpf": "12345678901",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "(11) 99999-9999",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "lastUpdate": "2025-01-20T14:45:00.000Z",
    "tournaments": [
      {
        "tournamentId": "uuid-tournament-1",
        "categories": ["X1", "X2"],
        "registrationDate": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
]
```

### Inscrições (registrations.json)
```json
[
  {
    "id": "uuid-registration",
    "tournamentId": "uuid-tournament",
    "player1": {
      "name": "João Silva",
      "cpf": "12345678901",
      "email": "joao@email.com",
      "phone": "(11) 99999-9999"
    },
    "partner": {
      "name": "Maria Santos",
      "cpf": "98765432102",
      "email": "maria@email.com",
      "phone": "(11) 88888-8888"
    },
    "category": "X2",
    "price": 30,
    "partnerPrice": 10,
    "registeredAt": "2025-01-15T10:30:00.000Z"
  }
]
```

## Algoritmo de Cálculo

### Pseudocódigo Principal
```javascript
function calculatePlayerPrice(cpf, basePrice, additionalPrice, newCategoriesCount) {
    // 1. Buscar total de inscrições existentes do jogador
    existingRegistrations = getPlayerTotalRegistrations(cpf)
    
    // 2. Calcular preço das novas inscrições
    totalNewPrice = 0
    
    for (i = 0; i < newCategoriesCount; i++) {
        currentRegistrationIndex = existingRegistrations + i
        
        if (currentRegistrationIndex == 0) {
            // Primeira inscrição do jogador
            totalNewPrice += basePrice
        } else {
            // Inscrições adicionais
            totalNewPrice += additionalPrice
        }
    }
    
    return {
        existingRegistrations: existingRegistrations,
        newRegistrationsPrice: totalNewPrice,
        totalPrice: totalNewPrice
    }
}
```

### Validações Implementadas

1. **Validação de CPF**:
   - 11 dígitos
   - Não pode ter todos os dígitos iguais
   - Validação de dígitos verificadores

2. **Validação de Duplicidade**:
   - Um CPF não pode se inscrever duas vezes na mesma categoria do mesmo campeonato
   - Verificação separada para jogador principal e parceiro

3. **Validação de Dados**:
   - Campos obrigatórios (nome, CPF, email, telefone)
   - Categorias válidas para o campeonato
   - Dados do parceiro quando necessário (X2, Misto)

## Benefícios do Sistema

1. **Transparência**: Preços calculados de forma clara e consistente
2. **Flexibilidade**: Funciona para qualquer número de categorias e campeonatos
3. **Escalabilidade**: Suporta múltiplos jogadores e parceiros
4. **Auditoria**: Histórico completo de todas as inscrições e preços
5. **Prevenção de Fraudes**: Validação rigorosa de CPF e duplicidade

## Considerações Importantes

- O cálculo é sempre **individual por jogador**
- Parceiros pagam separadamente baseado em seu próprio histórico
- O preço é calculado na **ordem cronológica** das inscrições
- Exclusões de inscrições afetam o histórico do jogador
- Todos os preços são armazenados para auditoria
