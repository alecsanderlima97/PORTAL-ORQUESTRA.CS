# Contrato de sincronização do Portal Orquestra.cs

Este contrato padroniza o resumo enviado por cada sistema para o Portal. O sistema de origem continua sendo responsável por usuários, acessos, uso e cadastro operacional. O Portal mantém a visão consolidada, os vínculos entre cliente e produto e a integração financeira com o Asaas.

## Regras de propriedade

- `customer`: cadastro do cliente e localização comercial.
- `contract`: plano, valor, vencimento e situação do produto naquele sistema.
- `users`: usuários, atividade, presença e dispositivo informado pelo sistema.
- `billingCharges` e identificadores Asaas: pertencem ao Portal.
- Campos ausentes não apagam informação já sincronizada. Para limpar um campo, o sistema deve enviar `null` explicitamente.
- Cada alteração deve aumentar `contract.dataVersion` ou informar `sourceUpdatedAt`.

## Snapshot

Enviar `POST` para `/api/connectors/snapshot` com o segredo no cabeçalho `x-orquestra-connector-secret`.

```json
{
  "sourceSystem": "orquestra_hub",
  "snapshotId": "hub-2026-10-16-0001",
  "generatedAt": "2026-10-16T18:00:00.000Z",
  "tenants": [
    {
      "externalTenantId": "id-da-empresa-no-sistema",
      "customer": {
        "companyName": "Mister 21",
        "legalName": "MISTER CONCEITO ITAPEVA LT",
        "tradeName": "Mister 21",
        "responsibleName": "Nome do responsável",
        "ownerGoogleEmail": "responsavel@exemplo.com",
        "contactEmail": "contato@exemplo.com",
        "contactPhone": "(15) 99999-9999",
        "document": "somente quando autorizado",
        "documentType": "CNPJ",
        "cep": "18400-000",
        "street": "Rua exemplo",
        "number": "180",
        "neighborhood": "Centro",
        "city": "Itapeva",
        "state": "SP",
        "address": "Rua exemplo, 180 - Centro - Itapeva - SP",
        "googleBusinessUrl": "https://maps.google.com/?cid=exemplo",
        "notes": "Observações internas do cadastro."
      },
      "contract": {
        "plan": "Profissional",
        "subscriptionStatus": "ativo",
        "monthlyFee": 120,
        "billingDay": 30,
        "graceDays": 3,
        "billingMethod": "PIX",
        "startDate": "2026-06-30",
        "renewalDate": "2026-10-30",
        "nextDueDate": "2026-10-30",
        "notes": "Observações específicas do contrato, se houver.",
        "billingStatus": "em_dia",
        "paidThroughDate": "2026-10-29",
        "dataVersion": 3,
        "sourceUpdatedAt": "2026-10-16T17:55:00.000Z"
      },
      "users": [
        {
          "externalUserId": "id-do-usuario",
          "name": "Nome do usuário",
          "email": "usuario@exemplo.com",
          "role": "proprietario",
          "active": true,
          "lastActivityAt": "2026-10-16T17:50:00.000Z",
          "lastSeenAt": "2026-10-16T17:59:00.000Z",
          "lastLoginAt": "2026-10-16T17:40:00.000Z",
          "deviceType": "notebook",
          "operatingSystem": "Windows",
          "browser": "Chrome"
        }
      ],
      "lastActivityAt": "2026-10-16T17:59:00.000Z",
      "recentChangesLast30Days": 4,
      "activeUsersLast30Days": 1,
      "pendingInvitations": 0
    }
  ]
}
```

## Eventos

O endpoint `/api/connectors/lifecycle` aceita os mesmos blocos `customer` e `contract` nos eventos `client.updated`, `subscription.updated` e `billing.updated`. O `eventId` deve ser único por sistema e cliente para permitir reprocessamento sem duplicar alterações.

## Comandos do Portal

Quando o sistema de origem expõe `/api/connectors/commands`, o Portal pode enviar alterações comerciais para ele com o mesmo segredo server-side. O comando deve validar `sourceSystem`, `targetSystem`, `externalTenantId`, janela de tempo e `commandId`, aplicar somente campos permitidos e registrar auditoria no sistema de origem.

O Portal envia `tenant.updated` para o Orquestra Hub quando os campos comerciais do serviço são salvos. O envio é complementar: se o sistema de origem estiver indisponível, o cadastro já salvo na Central permanece e recebe status de sincronização pendente; nenhuma cobrança é criada por esse comando.
