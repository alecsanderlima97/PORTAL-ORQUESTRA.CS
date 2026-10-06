# Configuração do acesso seguro

Esta etapa prepara o Portal para separar administradores Orquestra.cs, administradores de empresa e usuários finais.

## Firebase Console

1. Ative o provedor de login que será usado, inicialmente E-mail/senha.
2. Crie sua conta administrativa no Firebase Authentication.
3. Configure o Firestore em modo de produção.
4. Cadastre as variáveis públicas do Firebase no ambiente local e na Vercel.
5. Gere uma credencial de serviço somente para o ambiente server-side. No ambiente local, prefira salvar o arquivo fora do Git e apontar `FIREBASE_SERVICE_ACCOUNT_FILE`; na Vercel, use `FIREBASE_SERVICE_ACCOUNT_JSON` como variável protegida.

Nunca coloque a credencial de serviço em `NEXT_PUBLIC_*`, no GitHub ou em código do navegador.

## Primeiro administrador

Com as variáveis configuradas localmente, use o e-mail da conta criada:

```powershell
$env:ORQUESTRA_PLATFORM_OWNER_EMAIL = "seu-email-administrativo"
$env:FIREBASE_SERVICE_ACCOUNT_FILE = "C:\caminho-seguro\orquestra-firebase-admin.json"
npm run bootstrap:owner
```

O comando grava apenas o perfil administrativo no Firestore. Ele não cria senha, não publica nada e não concede acesso a outras contas.

## Papéis

- `platform_owner`: proprietário da Central, reservado à conta principal da Orquestra.cs.
- `orquestra_admin`: equipe interna autorizada.
- `company_owner` e `company_admin`: responsáveis pela própria empresa.
- `company_user` e `viewer`: acessos limitados dentro do próprio tenant.

## Academia como primeiro conector

Na primeira integração, o sistema da academia deverá enviar à Central somente um resumo assinado:

- proprietários e administradores;
- equipe autorizada;
- quantidade de usuários finais;
- usuários ativos nos últimos 30 dias;
- última atividade e saúde da conexão.

Os cadastros completos, senhas, dados de alunos e regras internas continuam no sistema da academia. A Central só exibirá detalhes pessoais quando isso for necessário, autorizado e previsto no escopo.

## Antes de produção

Validar com o Firebase Emulator Suite ou ambiente separado:

- login válido e inválido;
- usuário sem perfil;
- cliente tentando acessar `/central-admin`;
- administrador tentando acessar dados de outro tenant;
- alteração de papel pelo navegador;
- gravação direta de auditoria;
- sessão revogada;
- encerramento de sessão.
