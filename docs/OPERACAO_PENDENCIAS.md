# Pendências operacionais

Itens que dependem de configuração no ambiente ou de decisão do time, e que não são resolvidos pelo código.

## 1. Expiração da coleção `rateLimits` (TTL)

O contador de rate limit grava o campo `expiresAt` em cada documento. Sem uma política de TTL ativa, os documentos se acumulam.

Ativar (requer acesso administrativo ao projeto Firebase):

```bash
gcloud firestore fields ttls update expiresAt \
  --collection-group=rateLimits \
  --enable-ttl \
  --database='(default)' \
  --project=<ID_DO_PROJETO>
```

Verificar depois de alguns minutos: o console do Firestore deve mostrar a política de TTL em `rateLimits` com o campo `expiresAt`.

## 2. Chave de pedido de crédito (`createCreditOrderKey`)

Hoje a chave do pedido é um HMAC de `sourceSystem:externalTenantId:packageId:janela`, com janela de 10 minutos. Consequência: o mesmo cliente que pede o mesmo pacote em janelas diferentes recebe pedidos diferentes, e pode gerar duas cobranças.

Correção proposta (ainda não aplicada, por mexer em cobrança):

- Reutilizar o pedido aberto para a mesma combinação de cliente e pacote, enquanto ele estiver em `aberta` ou `creating` e não tiver expirado.
- Gerar uma nova chave só depois que o pedido anterior for `paga`, `cancelada` ou `estornada`.

Antes de aplicar: validar com o emulador do Firestore, cobrindo o caso de virada de janela.

## 3. Conector dos sistemas

Confirmar que o conector de cada sistema deduplica o comando `ai_credits.granted` pelo `commandId`, que é o ID do pedido. Sem isso, uma entrega repetida após expirar a trava de 2 minutos pode liberar créditos de novo.

## 4. Asaas e IP de origem

- Confirmar no sandbox do Asaas que `GET /payments?externalReference=` retorna a cobrança esperada.
- Confirmar na Vercel que o último valor de `x-forwarded-for` é o IP real do cliente.

## 5. Decisões de conteúdo e produto

- Domínio do Blend: hoje aponta para `orquestra-blend.vercel.app`.
- E-mail de suporte: hoje `orquestracs@gmail.com`.
- Referências de clientes (Portobelo, PR Perfumaria, Dama de Ferro, Vanmarte) aparecem em "Sistemas publicados". Confirmar autorização ou separar como "Projetos".
- Imagem 1200×630 para compartilhamento.
- Itens "Em breve" da barra lateral do portal: manter ou ocultar.
- Botão de notificações da Central Admin, que não tem ação: implementar ou remover.
- Rótulos de situação de contrato na Central Admin: unificar com os do portal.
