require('dotenv').config();
const express = require('express');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(express.static('.'));

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});
const preference = new Preference(client);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const PRODUCTS = {
  starter: {
    title: 'DMF Academy — Starter',
    description: '4 recorded core modules, private community, templates & presets, email support',
    price: 247,
    currency: 'USD'
  },
  pro: {
    title: 'DMF Academy — Pro',
    description: '8 live 1-on-1 classes on Zoom, personalized feedback, free mastering, WhatsApp access, labels session',
    price: 497,
    currency: 'USD'
  },
  elite: {
    title: 'DMF Academy — Elite',
    description: '12 extended sessions, co-production EP, label pitch strategy, 6-month mentoring, lifetime community',
    price: 997,
    currency: 'USD'
  },
  addon: {
    title: 'DMF Academy — How to Reach Labels',
    description: 'Focused session on presenting your music and contacting labels: approach strategy and track presentation',
    price: 80,
    currency: 'USD'
  }
};

app.post('/api/create-preference', async (req, res) => {
  const { productId, buyerEmail } = req.body;

  const product = PRODUCTS[productId];
  if (!product) {
    return res.status(400).json({ error: 'Invalid product' });
  }

  try {
    const body = {
      items: [{
        id: productId,
        title: product.title,
        description: product.description,
        quantity: 1,
        unit_price: product.price,
        currency_id: product.currency
      }],
      back_urls: {
        success: BASE_URL + '/payment-result.html?status=approved',
        failure: BASE_URL + '/payment-result.html?status=rejected',
        pending: BASE_URL + '/payment-result.html?status=pending'
      },
      auto_return: 'approved',
      statement_descriptor: 'DMF ACADEMY',
      external_reference: productId + '-' + Date.now()
    };

    if (buyerEmail) {
      body.payer = { email: buyerEmail };
    }

    const result = await preference.create({ body });
    res.json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point
    });
  } catch (err) {
    console.error('Mercado Pago error:', err);
    res.status(500).json({ error: 'Could not create payment preference' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('DMF Academy server running on port ' + PORT);
});
