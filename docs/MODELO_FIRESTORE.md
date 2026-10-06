# Modelo inicial do Firestore

O Portal começa como central de acesso e controle comercial. Os sistemas atuais continuam separados: a Central registra contratos, cobrança e indicadores resumidos, mas nunca grava diretamente nos bancos dos sistemas externos.

## Coleções

### `users/{uid}`

- `name`, `email`, `active`
- `role`: `platform_owner`, `orquestra_admin`, `company_owner`, `company_admin`, `company_user` ou `viewer`
- `tenantId`: empresa do cliente ou `null` para equipe Orquestra.cs
- `createdAt`, `updatedAt`

Os perfis são criados e alterados apenas pelo servidor. O navegador não pode mudar papel, tenant ou status.

### `companies/{tenantId}`

- `legalName`, `tradeName`, `responsibleName`
- `contactEmail`, `contactPhone`, `document` quando necessário
- `city`, `state`, `address` e `coordinates` quando necessárias
- `plan`, `contractStatus`, `accessStatus`
- `monthlyFee`, `billingDay`, `graceDays`
- `developmentFee`, `implementationFee`, `supportFee`
- `startDate`, `renewalDate`, `notes`
- `createdAt`, `updatedAt`

### `managedServices/{serviceId}`

- `tenantId`, `name`, `type`, `url`, `plan`
- `environment`: `production`, `staging` ou `development`
- `accessStatus`
- `connectorStatus`: `pendente`, `ativo`, `com_falha` ou `desativado`
- `externalTenantId`, `lastSyncAt`, `lastKnownStatus`
- `createdAt`, `updatedAt`

### `billingCharges/{chargeId}`

- `tenantId`, `referenceMonth`, `amount`, `dueDate`, `paidAt`
- `status`: `agendada`, `aberta`, `pendente`, `paga`, `em_processamento`, `vencida`, `em_tolerancia`, `bloqueada`, `estornada`, `cancelada`, `falha_pagamento` ou `revisao_manual`
- `paymentProvider` e `providerReference`, somente quando houver checkout real
- `blockedAt`, `releasedAt`, `manualReleaseReason`
- `createdAt`, `updatedAt`

### `usageSummaries/{summaryId}`

- `tenantId`, `serviceId`
- `totalUsers`, `owners`, `administrators`, `staff`, `endUsers`
- `activeUsersLast30Days`, `lastActivityAt`, `updatedAt`

Ela guarda somente o resumo operacional enviado pelo conector. Dados pessoais de alunos, funcionários ou clientes finais permanecem no sistema de origem.

### `accessCommands/{commandId}`

- `tenantId`, `serviceId`, `command`
- `status`: `enviado`, `processando`, `confirmado`, `falhou` ou `requer_intervencao_manual`
- `requestedBy`, `reason`, `requestedAt`, `confirmedAt`
- `attempts`, `lastError`, `idempotencyKey`

### `opportunities/{opportunityId}`

- `companyName`, `segment`, `city`, `state`
- `contactPhone`, `contactEmail`, `website`
- `coordinates`, `source`, `commercialStatus`, `nextTaskAt`
- `potentialMonthlyFee`, `potentialDevelopmentFee`
- `assignedTo`, `createdAt`, `updatedAt`

### `auditLogs/{logId}`

- `tenantId`, `actorUserId`, `actorRole`
- `action`, `targetType`, `targetId`, `metadata`
- `createdAt`

Esta coleção é escrita somente pelo servidor.

## Integrações com sistemas existentes

Cada sistema pode ter um conector próprio. Ele autentica no servidor, envia um resumo assinado de uso e confirma qualquer comando recebido. A Central não considera bloqueio ou liberação concluído até receber essa confirmação.

Para a academia, por exemplo, o resumo pode informar proprietários, administradores, equipe, usuários finais, usuários ativos nos últimos 30 dias e a última atividade. A Central não precisa copiar a ficha dos alunos.

## Regra de negócio inicial

Na Fase 1, o portal sinaliza atraso e permite liberação manual auditada. A automação de bloqueio após a tolerância, checkout e conectores entram depois de validarmos a operação real.
