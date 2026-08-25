import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    console.error('Stripe config missing:', { 
      hasSecret: !!process.env.STRIPE_SECRET_KEY,
      hasPrice: !!process.env.STRIPE_PRICE_ID
    });
    return res.status(500).json({ error: 'Payment system not configured' });
  }

  const { userEmail } = req.body;

  if (!userEmail) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/?payment=cancelled`,
      customer_email: userEmail,
      metadata: {
        userEmail: userEmail
      }
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: error.message || 'Checkout failed' });
  }
}
