# Modelo inicial do Firestore

Este portal comeca como central de acesso e controle comercial. Os sistemas atuais continuam separados.

## Colecoes

### `users/{uid}`

- `name`
- `email`
- `role`: `orquestra_admin`, `platform_owner`, `company_owner`, `company_admin`, `company_user`, `viewer`
- `tenantId`: id da empresa do cliente ou `null` para admin Orquestra.cs
- `active`
- `createdAt`
- `updatedAt`

### `companies/{tenantId}`

- `name`
- `document`
- `status`: `ativo`, `teste`, `vencendo`, `inadimplente`, `bloqueado`
- `plan`
- `monthlyFee`
- `billingDay`
- `graceDays`
- `blockedAt`
- `createdAt`
- `updatedAt`

### `companyModules/{moduleAccessId}`

- `tenantId`
- `moduleId`
- `name`
- `externalUrl`
- `status`
- `accessMode`: `external_link`
- `createdAt`
- `updatedAt`

### `payments/{paymentId}`

- `tenantId`
- `referenceMonth`
- `amount`
- `dueDate`
- `paidAt`
- `status`: `pendente`, `pago`, `atrasado`
- `manualConfirmedBy`
- `createdAt`

### `auditLogs/{logId}`

- `tenantId`
- `actorUserId`
- `actorRole`
- `action`
- `targetType`
- `targetId`
- `metadata`
- `createdAt`

## Regra de negocio inicial

Na Fase 1, o portal deve sinalizar atraso e permitir bloqueio manual. A automacao de bloqueio apos 5 dias entra depois com Firebase Functions agendada para evitar bloqueio indevido antes de validar a operacao real.
