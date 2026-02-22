import { stripe } from '@/lib/stripe';
import { WebhookDispatcher } from '@/lib/webhookDispatcher';
import prisma from '@/lib/prisma';

export interface TokenizeCardInput {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
}

export interface ProcessPaymentInput {
    amount: string;
    currency: string;
    paymentIntentId: string;
    token: string;
}

export class PaymentService {
    /**
     * Converts raw card details into a Stripe Token using Stripe's backend API.
     * Note: This is executed entirely server-side. Raw card data is never
     * logged or persisted to any database.
     */
    static async tokenizeCard(input: TokenizeCardInput): Promise<string> {
        if (!input.cardNumber || input.cardNumber.length < 13) {
            throw new Error('Invalid card number length');
        }

        if (!input.cvv || input.cvv.length < 3) {
            throw new Error('Invalid CVV');
        }

        // Mock for local testing
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_mock') {
            return "tok_mocked_for_local_testing";
        }

        try {
            const token = await stripe.tokens.create({
                card: {
                    number: input.cardNumber,
                    exp_month: input.expiryMonth,
                    exp_year: input.expiryYear,
                    cvc: input.cvv,
                },
            });

            return token.id;
        } catch (error: any) {
            console.error('Stripe Tokenization Error:', error.message || error);
            throw new Error(`Tokenization failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Confirms a Stripe PaymentIntent with a given token.
     * 
     * @param input The process payment input including intent id and token
     * @param transactionId Our internal DB transaction id
     * @param callbackUrl The AI Agent's webhook URL to notify
     */
    static async chargeToken(
        input: ProcessPaymentInput,
        transactionId: string,
        callbackUrl?: string
    ): Promise<{ success: boolean; transactionId: string; message?: string }> {
        try {
            if (!input.paymentIntentId) {
                throw new Error("Missing PaymentIntent ID");
            }

            let success = true;

            // Mock for local testing
            if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock') {
                // 1. Create a PaymentMethod from the token
                const paymentMethod = await stripe.paymentMethods.create({
                    type: 'card',
                    card: { token: input.token }
                });

                // 2. Confirm the existing PaymentIntent using the new PaymentMethod
                const intent = await stripe.paymentIntents.confirm(input.paymentIntentId, {
                    payment_method: paymentMethod.id,
                });

                success = intent.status === 'succeeded' || intent.status === 'requires_capture';
            }

            // 3. Mark DB Transaction as succeeded
            await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: success ? 'succeeded' : 'failed',
                    completed_at: new Date(),
                    error_message: success ? null : 'Payment intent confirmation failed',
                }
            });

            // 4. Dispatch Webhook
            if (callbackUrl) {
                try {
                    await WebhookDispatcher.dispatch(callbackUrl, {
                        transaction_id: transactionId,
                        status: success ? 'succeeded' : 'failed',
                        amount: parseInt(input.amount, 10),
                        currency: input.currency,
                    });
                } catch (e) {
                    console.error("Webhook dispatch failed locally", e);
                }
            }

            return {
                success,
                transactionId,
                message: success ? undefined : 'Payment confirmation failed',
            };
        } catch (error: any) {
            console.error('Stripe Charge Error:', error.message || error);

            // Mark DB Transaction as failed
            await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'failed',
                    completed_at: new Date(),
                    error_message: error.message || 'Unknown charge error',
                }
            });

            // Dispatch webhook failure
            if (callbackUrl) {
                try {
                    await WebhookDispatcher.dispatch(callbackUrl, {
                        transaction_id: transactionId,
                        status: 'failed',
                        amount: parseInt(input.amount, 10),
                        currency: input.currency,
                        error_message: error.message || 'Unknown charge error'
                    });
                } catch (e) {
                    console.error("Webhook dispatch failed locally", e);
                }
            }

            return { success: false, transactionId, message: error.message || 'Payment failed' };
        }
    }
}
