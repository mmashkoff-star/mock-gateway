const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const payments = new Map();

app.post('/payments', (req, res) => {
  const { amount, currency, description, notification_url } = req.body;
  const id = 'test_' + Date.now();
  payments.set(id, { id, amount, currency, description, notification_url, status: 'pending' });

  const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;

  res.json({
    payment_id: id,
    status: 'pending',
    pay_url: `${baseUrl}/pay/${id}`
  });
});

app.get('/pay/:id', (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) return res.status(404).send('Payment not found');
  res.send(`
    <h1>Оплата заказа (МОК)</h1>
    <p>ID: ${payment.id}</p>
    <p>Сумма: ${payment.amount} ${payment.currency}</p>
    <p>Описание: ${payment.description}</p>
    <form method="POST" action="/pay/${payment.id}/confirm">
      <button type="submit">Оплатить успешно</button>
    </form>
    <form method="POST" action="/pay/${payment.id}/cancel">
      <button type="submit">Отказаться</button>
    </form>
  `);
});

async function sendWebhook(payment, status) {
  if (!payment.notification_url) return;
  const payload = {
    payment_id: payment.id,
    status,
    amount: payment.amount,
    currency: payment.currency,
    test_mode: true
  };
  try {
    await axios.post(payment.notification_url, payload);
  } catch (e) {
    console.error('Webhook error', e.message);
  }
}

app.post('/pay/:id/confirm', async (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) return res.status(404).send('Payment not found');
  payment.status = 'succeeded';
  await sendWebhook(payment, 'succeeded');
  res.send('Оплата успешно эмулирована');
});

app.post('/pay/:id/cancel', async (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) return res.status(404).send('Payment not found');
  payment.status = 'canceled';
  await sendWebhook(payment, 'canceled');
  res.send('Отмена оплаты эмулирована');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Mock gateway on port', port));
