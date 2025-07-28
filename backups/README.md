# Backups dos dados do sistema

Este diretório contém backups automáticos dos dados críticos do sistema:

- `tournaments.json` - Campeonatos
- `registrations.json` - Inscrições  
- `players.json` - Jogadores
- `payment-status.json` - Status de pagamentos
- `users.json` - Usuários do sistema

## Estrutura de pastas:
```
backups/
├── 2025-07-28/
│   ├── tournaments.json
│   ├── registrations.json
│   ├── players.json
│   ├── payment-status.json
│   └── users.json
└── 2025-07-29/
    └── ...
```

Os backups são criados automaticamente:
- No início do servidor
- Antes de operações críticas
- Diariamente (se configurado)
