# Mercado Pago para DMF Academy

## Arquitectura

DMF Academy usa **Mercado Pago Checkout Pro** para compras únicas. El navegador
nunca recibe el Access Token ni la clave de firma. El Cloudflare Worker crea la
preferencia, valida el webhook, consulta Payment + Merchant Order y recién entonces
activa `enrollments/{uid}` en Firestore.

La aplicación **DMF Academy** pertenece a la cuenta comercial de VibraAlto que
recibe los fondos. Las cuentas `TESTUSER...` son compradores de prueba: no deben
crear ni administrar una aplicación de Mercado Pago.

Los entornos quedan separados de forma permanente:

| Entorno | Worker | Checkout | Secrets |
|---|---|---|---|
| Producción | `dmf-payments` | `init_point` | productivos |
| Sandbox | `dmf-payments-sandbox` | `sandbox_init_point` | de prueba |

Nunca cambies temporalmente el Worker productivo a sandbox. Wrangler trata los
secrets y `vars` de entornos nombrados como bindings independientes.

## 1. Aplicación de Mercado Pago

1. Inicia sesión con la cuenta comercial que recibirá los fondos.
2. En **Mercado Pago Developers → Tus integraciones**, usa la aplicación
   `DMF Academy`.
3. La integración es **Pagos online → Checkout Pro**.
4. Mantén separadas las credenciales de prueba y producción.
5. La Public Key no es necesaria para este flujo de redirección server-side.

## 2. Workers y variables

El `wrangler.toml` define dos destinos:

- `npx wrangler deploy` publica **dmf-payments** con
  `DMF_MP_ENVIRONMENT="production"`.
- `npx wrangler deploy --env sandbox` publica
  **dmf-payments-sandbox** con `DMF_MP_ENVIRONMENT="sandbox"`.

El Worker guarda `paymentEnvironment` en cada `checkoutSession`. Un webhook
recibido por el Worker equivocado devuelve `environment-mismatch` y no puede
crear matrícula. Las sesiones antiguas sin ese campo se consideran producción
para mantener compatibilidad.

## 3. Secrets aislados

Producción:

```bash
npx wrangler secret put MP_ACCESS_TOKEN
npx wrangler secret put MP_WEBHOOK_SECRET
npx wrangler secret put DMF_FIREBASE_PRIVATE_KEY
npx wrangler secret put DMF_FIREBASE_WEB_API_KEY
npx wrangler secret list
```

Sandbox:

```bash
npx wrangler secret put MP_ACCESS_TOKEN --env sandbox
npx wrangler secret put MP_WEBHOOK_SECRET --env sandbox
npx wrangler secret put DMF_FIREBASE_PRIVATE_KEY --env sandbox
npx wrangler secret put DMF_FIREBASE_WEB_API_KEY --env sandbox
npx wrangler secret list --env sandbox
```

Los secretos de Firebase pueden apuntar al mismo proyecto `dmf-academy`, pero
deben cargarse explícitamente en ambos Workers porque Cloudflare no hereda secrets
entre environments. Nunca copies un Access Token o Webhook Secret de PeptiBot a
DMF Academy.

## 4. Webhooks

Configura el evento **Pagos** de la aplicación DMF Academy con el endpoint que
corresponda al entorno:

Producción:

```text
https://dmf-payments.vibraalto-cl.workers.dev/webhook/mercadopago
```

Sandbox:

```text
https://dmf-payments-sandbox.vibraalto-cl.workers.dev/webhook/mercadopago
```

Cada endpoint debe usar la Secret Signature del entorno correspondiente. El Worker
rechaza firmas inválidas o vencidas y después verifica el pago contra la API de
Mercado Pago; no confía en el body del webhook ni en parámetros de retorno del
navegador.

## 5. Frontend

La landing productiva debe seguir apuntando a:

```text
https://dmf-payments.vibraalto-cl.workers.dev
```

No repuntes `dmf.vibraalto.cl` al Worker sandbox. Para un E2E de interfaz de
sandbox usa una preview/staging build que inyecte:

```bash
DMF_PAYMENTS_URL=https://dmf-payments-sandbox.vibraalto-cl.workers.dev
```

El generador `scripts/inject-academy-env.cjs` ya soporta esa variable. Como ambos
Workers verifican Firebase y usan el mismo Firestore de Academy, la página de
resultado puede consultar la sesión por `purchaseId`; la autorización sigue
dependiendo del UID autenticado.

## 6. Despliegue y prueba

Ejecuta primero:

```bash
node --test test/*.test.cjs
```

Despliega sandbox sin tocar producción:

```bash
npx wrangler deploy --env sandbox
npx wrangler tail --env sandbox --format pretty
```

Comprueba en sandbox:

1. `create-preference` devuelve un `sandbox_init_point`.
2. el comprador es una cuenta `TESTUSER...` distinta de la cuenta comercial;
3. el pago termina `approved`;
4. el webhook sandbox responde correctamente;
5. Payment + Merchant Order pertenecen a la preference y `purchaseId` esperados;
6. `enrollments/{uid}.status` queda `active`;
7. repetir el webhook no duplica la matrícula.

Para producción:

```bash
npx wrangler deploy
npx wrangler tail --format pretty
```

Realiza un cobro real de bajo monto y, si corresponde al plan de validación,
reembolsa después de confirmar webhook, enrollment, descriptor y recepción del
dinero.

## Operación y diagnóstico

- Los precios viven únicamente en `src/index.js`; el cliente envía solo
  `productId`.
- Cada preference usa `purchaseId` como `X-Idempotency-Key`.
- `production` selecciona exclusivamente `init_point`; `sandbox`,
  exclusivamente `sandbox_init_point`.
- Un `401` de webhook apunta a firma, headers o timestamp.
- `environment-mismatch` indica que una sesión de un entorno llegó al Worker del
  otro entorno.
- Una compra aprobada sin matrícula se investiga con `paymentId`, `purchaseId`
  y `wrangler tail`; nunca registres tokens, secretos o firmas completas.
