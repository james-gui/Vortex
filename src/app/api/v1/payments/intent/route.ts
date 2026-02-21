import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { createSession } from '@/lib/twilioSession';

export async function POST(request: NextRequest) {
    try {
        const apiKey = request.headers.get('x-api-key');
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });
        }

        const keyHashed = crypto.createHash('sha256').update(apiKey).digest('hex');

        // We assume we look for both live and test keys since we don't have environments mapped in detail,
        // but PRD mentions is_live. We can just search for the key regardless.
        const apiKeyRecord = await prisma.apiKey.findFirst({
            where: { key_hashed: keyHashed },
            include: { organization: true }
        });

        if (!apiKeyRecord) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        const body = await request.json();
        const { call_sid, amount, currency = 'usd', callback_url } = body;

        if (!call_sid || !amount || !callback_url) {
            return NextResponse.json({ error: 'Missing required fields: call_sid, amount, callback_url' }, { status: 400 });
        }

        let amountInt = 0;
        if (typeof amount === 'number') {
            amountInt = amount;
        } else {
            amountInt = parseInt(amount, 10);
        }

        if (isNaN(amountInt) || amountInt <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        await prisma.apiKey.update({
            where: { id: apiKeyRecord.id },
            data: { last_used_at: new Date() }
        });

        // 1. Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInt,
            currency: currency.toLowerCase(),
            capture_method: 'automatic',
            ...(apiKeyRecord.organization.stripe_connect_account_id
                ? {
                    on_behalf_of: apiKeyRecord.organization.stripe_connect_account_id,
                    transfer_data: { destination: apiKeyRecord.organization.stripe_connect_account_id }
                }
                : {})
        });

        // 2. Create DB Transaction
        const transaction = await prisma.transaction.create({
            data: {
                org_id: apiKeyRecord.org_id,
                amount: amountInt,
                currency: currency.toLowerCase(),
                status: 'pending',
                stripe_pi_id: paymentIntent.id,
            }
        });

        // 3. Create Twilio session tracking
        createSession(call_sid, {
            amount: amountInt.toString(),
            currency: currency.toLowerCase(),
            intentId: paymentIntent.id,
            transactionId: transaction.id,
            callbackUrl: callback_url,
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vortex.test';

        return NextResponse.json({
            transaction_id: transaction.id,
            redirect_url: `${baseUrl}/api/twilio/gather`, // Twilio TwiML URL
            status: 'pending'
        });

    } catch (error: any) {
        console.error('Intent Creation Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
