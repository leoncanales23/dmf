# Monitor de producción

`.github/workflows/monitor.yml` corre `scripts/monitor/prod-smoke.cjs` **cada 3 horas** (minuto 17, UTC) y a
pedido (Actions → *Monitor de producción DMF* → *Run workflow*). Solo lee: GET/HEAD, más un POST sin sesión al
firmador de video que **debe** ser rechazado (prueba que está vivo y que exige sesión).

| Grupo | Qué revisa |
|---|---|
| Landing | la página responde y carga en < 8 s; runtime 3D y capa de audio; precios y botón de compra; precio Starter de lanzamiento (USD 100); router de pagos y analytics; modelo 3D web y original; imagen fija del Receptor |
| Técnica | `/login`, `/academy`, `/payment-result`; `academy-env.js` con Firebase, Stream, firmador, pagos y proveedor; lecciones con video publicadas; Worker de Mercado Pago (`/health`); Worker de Klap (crítico solo si la landing vende por Klap); firmador de video |
| Soporte | email de soporte en la landing y en el resultado de pago; `/terminos`, `/privacidad`, `/reembolsos`; `robots.txt`, `sitemap.xml` |

- **❌ crítico**: el run falla y se abre (o se comenta) **un** issue con la etiqueta `monitor`, con la lista de
  fallas y el enlace al run. GitHub además avisa por email los runs fallidos.
- **⚠️ advertencia**: aparece en el resumen del run, nunca lo pone en rojo.
- Cuando producción vuelve a estar sana, el siguiente run comenta y **cierra** el issue.

Correrlo a mano:

```bash
npm run monitor                                                    # contra producción
node scripts/monitor/prod-smoke.cjs --base http://localhost:8765 --skip-workers   # contra el dev server
npm run test:monitor                                               # pruebas con HTTP simulado
```

Notas:
- El precio que cobra Mercado Pago no se puede leer sin una sesión de comprador; el monitor verifica el precio
  que muestra la landing. Tras cambiar un precio, redesplegar `workers/dmf-payments` sigue siendo manual.
- GitHub pausa los workflows programados de un repositorio sin actividad por 60 días; un push o un *Run
  workflow* los reactiva.
