import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      return res.status(200).json({ 
        success: true, 
        email: session.customer_email,
        message: 'Payment verified'
      });
    } else if (session.payment_status === 'unpaid') {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment not completed' 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment status unknown' 
      });
    }
  } catch (error) {
    console.error('Stripe verification error:', error);
    return res.status(500).json({ error: 'Payment verification failed' });
  }
}
