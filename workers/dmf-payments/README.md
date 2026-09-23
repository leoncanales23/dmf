# Mercado Pago para DMF Academy

## Solución recomendada

**Checkout Pro** es la opción adecuada para DMF Academy: los cuatro productos son
compras únicas, el comprador paga en la experiencia alojada por Mercado Pago y DMF
solo concede acceso después de verificar el pago en el backend. Esto reduce el
alcance PCI y permite ofrecer los medios de pago que Mercado Pago habilite para la
cuenta y el país del comprador.

La aplicación de software ya está implementada en este directorio como un
Cloudflare Worker. El Worker crea la preferencia, recibe el webhook firmado,
consulta Payment y Merchant Order en Mercado Pago y recién entonces activa
`enrollments/{uid}` en Firestore.

> La **aplicación de Mercado Pago asociada a la cuenta comercial** no puede crearse
> desde el repositorio: su titular debe crearla y aceptar los términos desde el
> panel de Mercado Pago. Nunca compartas las credenciales en un issue, commit o
> mensaje.

## 1. Crear la aplicación en Mercado Pago

1. Inicia sesión con la cuenta comercial que recibirá los fondos.
2. En **Mercado Pago Developers → Tus integraciones**, crea una aplicación llamada
   `DMF Academy`.
3. Selecciona **Pagos online** y **Checkout Pro** (sin plataforma/marketplace).
4. Completa los datos del negocio y activa las credenciales de producción cuando
   Mercado Pago lo permita.
5. Copia el **Access Token** de prueba para sandbox o el de producción para cobros
   reales. La Public Key no es necesaria para este flujo de redirección.

No uses credenciales de prueba con `DMF_MP_ENVIRONMENT = "production"`, ni
credenciales productivas con `"sandbox"`.

## 2. Configurar notificaciones

En **Webhooks** de la aplicación:

1. registra
   `https://dmf-payments.vibraalto-cl.workers.dev/webhook/mercadopago`;
2. habilita el evento **Pagos**;
3. copia la clave secreta de firma mostrada por Mercado Pago;
4. configura la misma URL tanto para pruebas como para producción.

La URL también viaja como `notification_url` en cada preferencia. El endpoint
rechaza firmas inválidas o vencidas y no confía en el estado enviado en el body.

## 3. Cargar secretos y desplegar

Desde `workers/dmf-payments`:

```bash
npx wrangler secret put MP_ACCESS_TOKEN
npx wrangler secret put MP_WEBHOOK_SECRET
npx wrangler secret put DMF_FIREBASE_PRIVATE_KEY
npx wrangler secret put DMF_FIREBASE_WEB_API_KEY
npx wrangler deploy
```

`DMF_FIREBASE_PRIVATE_KEY` debe contener el JSON completo de una cuenta de servicio
del proyecto `dmf-academy`. Los valores no secretos y el modo de checkout están en
`wrangler.toml`. Para una prueba controlada, cambia temporalmente
`DMF_MP_ENVIRONMENT` a `sandbox`, usa el Access Token de prueba y vuelve a desplegar.

## 4. Prueba de punta a punta

1. Ejecuta las pruebas del Worker:

   ```bash
   node --test test/*.test.cjs
   ```

2. En sandbox, inicia sesión en DMF con un usuario Firebase de prueba y pulsa un
   plan. Debe abrirse `sandbox_init_point`.
3. Completa el checkout con un comprador/tarjeta de prueba provisto por Mercado
   Pago; no uses cuentas o tarjetas reales en sandbox.
4. Confirma que el webhook responde `200`, que existe
   `payments/{paymentId}` y que `enrollments/{uid}.status` termina en `active`.
5. Confirma que `/payment-result.html?purchaseId=...` cambia a aprobado y que el
   usuario puede entrar a `/academy`.
6. Repite un webhook desde el panel: debe responder correctamente sin duplicar la
   matrícula.

Antes de cobrar, restaura `DMF_MP_ENVIRONMENT = "production"`, carga el Access
Token productivo, despliega y realiza un cobro real de bajo monto con posterior
reembolso. Verifica además en el panel el descriptor `DMF ACADEMY` y la recepción
del dinero.

## Operación y diagnóstico

- Los precios se definen únicamente en `src/index.js`; el cliente solo envía el
  `productId`.
- Cada preferencia usa el UUID de compra como `X-Idempotency-Key`.
- `production` selecciona exclusivamente `init_point`; `sandbox` selecciona
  exclusivamente `sandbox_init_point`, evitando enviar compradores reales al
  entorno de prueba.
- Una respuesta `401` del webhook suele indicar una clave de firma incorrecta,
  headers ausentes o una entrega con más de cinco minutos de antigüedad.
- Una compra aprobada sin matrícula debe investigarse con el `paymentId`, el
  `purchaseId` y los logs del Worker; nunca registres tokens ni firmas completas.
