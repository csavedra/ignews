import { NextApiRequest, NextApiResponse } from 'next'
import { Readable } from 'stream'
import Stripe from "stripe";
import { stripe } from '../../services/stripe';
import { saveSubscription } from './_lib/manageSubscription';

async function buffer(readable: Readable) {
    const chunks = [];

    for await (const chunk of readable) {
        chunks.push(
            typeof chunk === "string" ? Buffer.from(chunk) : chunk
        );
    }

    return Buffer.concat(chunks);
}

export const config = {
    api: {
        bodyParser: false
    }
}

const relevantEvents = new Set([
    'checkout.session.completed',
    'customer.subscriptions.updated',
    'customer.subscriptions.deleted',
])

export default async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {

        const buf = await buffer(req)
        const secret = req.headers['stripe-signature']

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                buf, secret, process.env.STRIPE_WEBHOOKS_SECRET
            )
        } catch (err) {
            return res.status(400).send(`webhook error: ${err.message}`)
        }

        const { type } = event;
        try {
            if (relevantEvents.has(type)) {
                switch (type) {
                    case 'customer.subscription.updated':
                    case 'customer.subscription.deleted':

                    const subscription = event.data.object as Stripe.Subscription
                        
                    await saveSubscription(
                        subscription.id,
                        subscription.customer.toString(),
                        false
                    );

                      break;
                    case 'checkout.session.completed':
                        const checkoutSession = event.data.object as Stripe.Checkout.Session
                        await saveSubscription(
                            String(checkoutSession.subscription),
                            String(checkoutSession.customer),
                            true
                        )

                        break;
                    default:
                        throw new Error('unhandled event')
                }
            }
        } catch (err) {
            return res.json({ error: 'Webhook handler' })
        }

        res.json({ received: true })
    } else {
        res.setHeader('Allow', 'POST'),
            res.status(405).end('Method not allowed')
    }
}