# Klap Checkout Flex para DMF Academy

Worker independiente del de Mercado Pago (`workers/dmf-payments`), que no se modifica.
Arquitectura completa y plan de sandbox: [`docs/IMMERSIVE_COMMERCE.md`](../../docs/IMMERSIVE_COMMERCE.md).

| Entorno | Worker | Secret de Klap |
|---|---|---|
| Producción | `dmf-klap-payments` | `KLAP_API_KEY_PRODUCTION` |
| Sandbox | `dmf-klap-payments-sandbox` | `KLAP_API_KEY_SANDBOX` |

Si un Worker ve la clave del otro entorno, responde `503 klap-not-configured` y no llama a Klap.

## Rutas

| Método | Ruta | Uso |
|---|---|---|
| POST | `/create-order` | ID token Firebase + `{ productId }` → orden en Klap → `{ provider, purchaseId, checkoutUrl, checkoutConfig }` |
| POST | `/webhook/klap/confirm` | notificación de pago confirmado |
| POST | `/webhook/klap/reject` | notificación de pago rechazado |
| GET | `/check-status?purchaseId=` | estado universal + `enrolled`, reconcilia contra Klap si hace falta |
| GET | `/health` | `configured: true/false`, sin secretos |

## Antes del primer despliegue sandbox

1. Confirmar en developers.klap.cl la URL base, el esquema de creación de orden
   (`buildOrderRequest` en `src/klap.js`), la ruta de consulta y los nombres de estado.
2. Definir los montos CLP en `src/catalog.js`.
3. Configurar:

```bash
cd workers/dmf-klap-payments
npx wrangler secret put KLAP_API_KEY_SANDBOX --env sandbox
npx wrangler secret put DMF_FIREBASE_PRIVATE_KEY --env sandbox
npx wrangler secret put DMF_FIREBASE_WEB_API_KEY --env sandbox
# KLAP_API_BASE (y KLAP_ORDER_PATH si no es /orders) como vars del env sandbox
npx wrangler deploy --env sandbox
```

Nunca cargues `KLAP_API_KEY_PRODUCTION` en el env sandbox ni al revés.

## Tests

```bash
node workers/dmf-klap-payments/test/klap.test.mjs
node workers/dmf-klap-payments/test/worker.test.mjs
```

Los tests ejercitan el Worker real (`route`) contra un Firestore, Firebase Auth y Klap simulados a nivel HTTP:
creación de orden, producto inválido, manipulación de precio, entornos cruzados, autenticación de webhook,
monto/referencia alterados, webhooks duplicados y concurrentes, rechazo, reembolso y reconciliación.
