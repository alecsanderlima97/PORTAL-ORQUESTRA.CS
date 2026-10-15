# Sincronização do ciclo de vida dos clientes

A Central Orquestra.cs preserva a empresa e o histórico do serviço. Quando um cliente for arquivado em um sistema de origem, a Central deve receber um evento e marcar somente o serviço como `cancelado` e `bloqueado`.

## Endpoint

`POST https://portal.orquestracs.com/api/connectors/lifecycle`

Headers:

- `Content-Type: application/json`
- `x-orquestra-connector-secret`: segredo configurado somente no servidor do sistema de origem e na Central

Exemplo de evento de arquivamento:

```json
{
  "eventId": "uuid-gerado-no-sistema-de-origem",
  "sourceSystem": "orquestra_auto_detail",
  "externalTenantId": "alisson-estetica-automotiva-legado",
  "eventType": "client.archived",
  "emittedAt": "2026-10-13T18:00:00.000Z",
  "reason": "Cliente arquivado pelo administrador"
}
```

Para atualização comercial, use `client.updated` ou `subscription.updated` e envie, quando disponíveis, `subscriptionStatus`, `startDate`, `renewalDate` e `monthlyFee`.

## Regras

- O segredo nunca pode ser enviado pelo navegador.
- O sistema de origem deve gravar a alteração localmente e disparar o evento por uma função server-side, Cloud Function ou função Vercel.
- `eventId` deve ser único e estável para permitir reenvio sem duplicar efeitos.
- A Central identifica o vínculo por `sourceSystem + externalTenantId`.
- A Central não exclui a empresa nem as cobranças; ela registra auditoria e bloqueia o serviço.
- Eventos antigos, inválidos ou sem vínculo são rejeitados para revisão.

## Configuração

Na Central, configure `ORQUESTRA_CONNECTOR_SHARED_SECRET`. Em cada sistema, configure o mesmo valor e a URL do endpoint como segredo/variável de servidor. Nunca coloque esses valores em `VITE_*`, `NEXT_PUBLIC_*` ou código entregue ao navegador.
