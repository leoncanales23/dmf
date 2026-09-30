# VibraAlto Immersive Commerce — DMF (v1)

Estado: **fase 1** (motor de pagos multi-proveedor + Klap Checkout Flex en sandbox, aceleración del GLB,
funnel de analítica, flags). Showcase: `dmf.vibraalto.cl`. Nada de esto activa Klap en producción:
el proveedor por defecto sigue siendo Mercado Pago hasta que el sandbox de Klap pase la lista de la §8.

---

## 1. Mapa de arquitectura actual (auditado antes de codificar)

| Sistema | Fuente de verdad | Generado / desplegado | Nota |
|---|---|---|---|
| Landing | `index.html` (raíz) | `public/index.html` lo **regenera** `scripts/build-3d.cjs` + `inject-*.cjs` (`npm run build:hyperdrive`) | Nunca editar solo `public/index.html`: el build lo sobrescribe. |
| Capas 3D / audio | `scripts/overdrive/*.js` | Inyectadas en `public/index.html` por el build | Un solo rAF (`signal-bus.js`), Three r128 + GLTFLoader cargados una vez por `relic.js`. |
| Motor de señal | `scripts/overdrive/engine.js` | idem | Bandas `low/mid/high` suavizadas (attack/release), `energy`, onsets, predictor de beat, `DMFPerformanceGovernor` (high → balanced → lite, nunca sube) y escalador de resolución. |
| Audio | `scripts/overdrive/signal-bus.js` | idem | Un `AudioContext` + `AnalyserNode` al primer gesto; sin permiso → estado idle; desactivado con reduced-motion / Save-Data. |
| Relic 3D | `assets/models/dmf-studio-optimized.glb` (8,0 MB) | `deploy.yml` copia `assets/models/*` a `public/assets/models/` | También es el archivo de "Descargar reliquia digital". |
| Mixer 3D | `assets/models/pioneer-djm-900nxs2-mixer-slide.glb` | idem | Ya cuantizado (`KHR_mesh_quantization`). |
| GLB chrome | `assets/models/dmf-signal.part*.b64` | decodificado en deploy | Checksum fijo (`check-3d.cjs`). |
| Páginas Academy | `public/login.html`, `public/academy.html`, `public/payment-result.html`, `public/academy-config.js` | versionadas tal cual | `/login`, `/academy/**`, `/payment-result` por rewrites de `firebase.json`. |
| Entorno runtime | `scripts/inject-academy-env.cjs` | `public/academy-env.js` (gitignored) | Firebase web config, URLs de Workers, demo. |
| Mercado Pago | `workers/dmf-payments` | `wrangler deploy` (prod) / `--env sandbox` | Checkout Pro, HMAC `x-signature`, verificación Payment + Merchant Order, idempotencia por `payments/{id}`, `enrollments/{uid}`. |
| Video firmado | `workers/dmf-stream-signer` | wrangler | Firebase Auth + enrollment → token Stream. |
| Datos | Firestore `dmf-academy` | `firestore.rules` | Cliente solo lee su `enrollments/{uid}` y su `progress`; todo lo de pagos es solo servidor. |
| Caché | `firebase.json` | — | `*.js` se sirve `immutable` 1 año → todo script estático nuevo se referencia con `?v=`. |

Flujo de compra actual: botón de plan → `buyWithMP` → (sin sesión) `sessionStorage.dmf_purchase_intent`
→ `/login` → `POST /create-preference` (ID token) → Checkout Pro → `/payment-result?purchaseId=…`
→ `GET /check-status` (ID token) → el servidor decide `enrolled`.

## 2. Qué agrega la fase 1

```
public/commerce/payment-router.js   capa común de checkout (landing + login + payment-result)
workers/klap-payments/              Worker Klap aislado: sandbox y producción separados
  src/catalog.js                    catálogo server-side (montos CLP)
  src/klap.js                       funciones puras: orden, autenticación webhook, estados, validación
  src/store.js                      Firestore REST con precondiciones (transiciones idempotentes)
  src/index.js                      rutas HTTP
assets/models/dmf-studio-web.glb    copia web del relic con Meshopt (8,0 MB → 2,9 MB)
```

### Router de pagos (frontend)

`DMFCommerce.createCheckout(provider, productId, idToken)` → `{ provider, purchaseId, checkoutUrl | checkoutConfig }`.
La landing y el login ya no conocen detalles de Mercado Pago ni de Klap.

Configuración (inyectada en `academy-env.js`, con valores por defecto seguros):

```js
window.__DMF_COMMERCE__ = {
  payments: { provider: 'mercadopago', fallbackProvider: 'mercadopago', klapEnabled: false },
  effects:  { audioReactive: true }
}
```

Variables de repositorio que lee `deploy.yml`: `DMF_PAYMENT_PROVIDER`, `DMF_PAYMENT_FALLBACK`, `DMF_KLAP_ENABLED`,
`DMF_KLAP_PAYMENTS_URL`, `DMF_KLAP_FLEX_SDK_URL`, `DMF_EFFECT_AUDIO_REACTIVE`. `academy-env.js` se sirve
`no-cache`, así que un cambio de flag llega en el siguiente deploy (rollback inmediato).

En v1 solo `audioReactive` tiene efecto; la calidad visual la sigue gobernando el `DMFPerformanceGovernor`
adaptativo (high → balanced → lite) de `engine.js`, que ya respeta reduced-motion y Save-Data.

- `DMF_PAYMENT_PROVIDER=klap` + `DMF_KLAP_ENABLED=true` en el build para usar Klap.
- `?payments=sandbox&provider=klap` fuerza Klap **solo en sandbox** (para QA), nunca en producción.
- Si Klap falla al crear la orden y el fallback está habilitado, se usa Mercado Pago.

### Estados universales

`created · pending · approved · rejected · cancelled · refunded` — el frontend consume esta semántica;
cada Worker traduce la de su proveedor.

## 3. Flujo Klap (Checkout Flex)

```
botón → router → POST klap-payments/create-order (ID token Firebase, solo productId)
      → Worker: catálogo → monto CLP, reference_id único → orders/{referenceId} (created)
      → API Klap (ApiKey server-side) → order_id → orders/{referenceId}.klapOrderId (pending)
      → frontend: KLAP_FLEX.init({ order_id }) si el SDK está configurado; si no, redirect_url
      → pago en Klap
      → POST /webhook/klap/confirm | /webhook/klap/reject
           Apikey == sha256(reference_id + order_id + ApiKey)  (hex, comparación en tiempo constante)
           → 200 JSON inmediato; el cumplimiento corre en ctx.waitUntil
           → consulta la orden a Klap (fuente de verdad) → valida referencia, order_id, monto,
             moneda, producto y entorno → approved → fulfilled (una sola vez) → enrollments/{uid}
      → /payment-result?purchaseId=<referenceId>&provider=klap
      → GET /check-status (ID token): si la orden sigue pendiente, reconcilia contra Klap
```

Idempotencia: `orders/{referenceId}` avanza `created → pending → approved → fulfilled` con
precondición `updateTime` de Firestore; un webhook repetido o concurrente no puede cumplir dos veces.

La reconciliación en `/check-status` cubre el caso en que el webhook respondió 200 pero el
cumplimiento posterior falló: la orden se vuelve a validar contra Klap al consultar el estado.

### Lo que NO se pudo verificar desde este entorno

La política de red bloquea `developers.klap.cl` y `klap.cl`. Confirmado por fuentes públicas:
validación `sha256(reference_id + order_id + ApiKey)` contra el header `Apikey`, `order_id`/`reference_id`,
webhooks de confirmación y rechazo. **Pendiente de confirmar con la documentación vigente antes del sandbox**:

- URL base de la API (sandbox y producción) → `KLAP_API_BASE` (sin valor por defecto: el Worker no
  llama a nada que no esté configurado explícitamente).
- Esquema exacto del cuerpo de creación de orden → aislado en `buildOrderRequest()` (un solo lugar).
- Ruta de consulta de orden y nombres de estado → `KLAP_ORDER_PATH`, `normalizeKlapStatus()`.
- URL del SDK de Checkout Flex → `DMF_KLAP_FLEX_SDK_URL`; sin ella se usa `redirect_url`.
- ~~Montos en CLP por producto~~ → definidos en `src/catalog.js` (ver §5.1).

## 4. Seguridad

- ApiKey solo como secret del Worker, con nombre distinto por entorno:
  `KLAP_API_KEY_SANDBOX` (env sandbox) y `KLAP_API_KEY_PRODUCTION` (producción). El Worker **se niega a
  operar** si encuentra la clave del otro entorno en sus bindings.
- El navegador solo envía `productId`; monto, moneda y descripción salen del catálogo del servidor.
- Nunca se guarda ni registra PAN/CVV (no pasan por nuestros servidores), ApiKey, hashes completos ni ID tokens.
- `orders` queda cerrado al cliente por la regla final `match /{document=**} { allow read, write: if false; }` de `firestore.rules`.
- Logs: `[KLAP]` / `[VIBRA PAYMENTS]` con `provider, environment, referenceId, orderId, status`.

## 5. Sandbox (plan)

1. Crear credenciales sandbox en Klap y confirmar endpoints (§3).
2. `cd workers/dmf-klap-payments && npx wrangler secret put KLAP_API_KEY_SANDBOX --env sandbox`
   (+ `DMF_FIREBASE_PRIVATE_KEY`, `DMF_FIREBASE_WEB_API_KEY`).
3. `npx wrangler deploy --env sandbox` → `dmf-klap-payments-sandbox`.
4. ~~Definir montos CLP~~ → hecho (§5.1).
5. Probar con `https://dmf.vibraalto.cl/?payments=sandbox&provider=klap#academy`: las tarjetas muestran el
   precio en pesos ("pago fácil en pesos con Klap") y el pago se crea en CLP.
6. Completar la tabla de aceptación (§8). Solo entonces producción (§5.2).

### 5.1 Precios

| Producto | Mercado Pago (USD) | Klap (CLP) |
|---|---|---|
| Starter (precio de lanzamiento) | 100 | $99.990 |
| Pro | 497 | $496.990 |
| Elite | 997 | $996.990 |
| Labels (adicional) | 80 | $79.990 |

Regla: USD × 1.000 − 10 (tipo comercial 1 USD ≈ 1.000 CLP, en formato retail …990). Cada Worker decide su
monto; la landing muestra las mismas cifras (`KLAP_CLP` en `index.html`) y `commerce.test.cjs` exige que los
tres coincidan. Para cambiar un precio se editan los dos catálogos y `KLAP_CLP`; el test falla si no.

### 5.2 Activación en producción

1. Redeploy de `workers/dmf-payments` (el Starter pasa a USD 100) y deploy de `workers/dmf-klap-payments`
   con `KLAP_API_KEY_PRODUCTION`, `KLAP_API_BASE`, `KLAP_WEBHOOK_BASE` y los secrets de Firebase.
2. Variables del repositorio: `DMF_PAYMENT_PROVIDER=klap`, `DMF_KLAP_ENABLED=true`,
   `DMF_KLAP_PAYMENTS_URL` (y `DMF_KLAP_FLEX_SDK_URL` si se usa el modal Flex; sin ella, redirección).
3. Siguiente deploy de la landing: el botón de compra cobra por Klap en pesos, con Mercado Pago como respaldo
   automático si Klap no puede tomar la orden. Revertir = `DMF_KLAP_ENABLED=false`.

## 6. Rendimiento 3D

- `dmf-studio-web.glb`: `gltfpack -cc -vpf` (Meshopt + posiciones float, normales/UV cuantizadas).
  Las posiciones siguen en espacio objeto en float32, así que el cálculo de zonas y los shaders del relic
  no cambian. `relic.js` registra `MeshoptDecoder`; si el decoder no carga, usa el GLB original.
- El GLB original (8,0 MB) se mantiene para la descarga "Reliquia digital" y el pipeline de impresión no se toca.

## 7. Analítica

`window.dmfTrack(event, props)` → `CustomEvent('dmf:analytics')` + `dataLayer.push` si existe. Eventos:
`landing_view, hero_interaction, audio_enabled, 3d_loaded, academy_view, pricing_view, cta_click,
checkout_started, checkout_provider, payment_approved, payment_rejected, conversion_complete`.
Nunca incluye email, uid, tokens ni datos de pago.

## 8. Aceptación Klap (sandbox)

| Paso | Estado |
|---|---|
| create order | pendiente de credenciales |
| order_id | pendiente |
| checkout renders | pendiente |
| payment approved | pendiente |
| webhook received | pendiente |
| authentication validated | cubierto por tests; pendiente en sandbox real |
| amount validated | cubierto por tests; pendiente en sandbox real |
| reference validated | cubierto por tests; pendiente en sandbox real |
| idempotency | cubierto por tests; pendiente en sandbox real |
| business fulfillment | cubierto por tests; pendiente en sandbox real |

## 9. Rollback

- Frontend: `DMF_PAYMENT_PROVIDER` sin definir (o `mercadopago`) → flujo idéntico al actual.
- Worker Klap: independiente; basta no desplegarlo o `wrangler delete`.
- GLB: revertir la línea del loader en `relic.js` vuelve al archivo original.
