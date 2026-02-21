import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession, deleteSession } from '@/lib/twilioSession';
import { PaymentService } from '@/services/paymentService';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const callSid = formData.get('CallSid') as string;
        const digits = formData.get('Digits') as string;

        if (!callSid) {
            return new NextResponse('Missing CallSid', { status: 400 });
        }

        const session = getSession(callSid);

        let twiml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';
        const gatherUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vortex.test'}/api/twilio/gather`;

        if (!session) {
            twiml += `  <Say>Session expired or invalid.</Say>\n  <Hangup/>\n`;
            twiml += '</Response>';
            return new NextResponse(twiml, { status: 200, headers: { 'Content-Type': 'text/xml' } });
        }

        if (!digits) {
            // Loop back if empty (should be handled by Gather timeout, but defensive practice)
            twiml += `  <Redirect>${gatherUrl}</Redirect>\n</Response>`;
            return new NextResponse(twiml, { status: 200, headers: { 'Content-Type': 'text/xml' } });
        }

        const { step, strikes } = session;

        if (step === 'card') {
            if (digits.length >= 13 && digits.length <= 19) {
                updateSession(callSid, { cardNumber: digits, step: 'expiry', strikes: 0 });
                twiml += `  <Redirect>${gatherUrl}</Redirect>\n`;
            } else {
                const nextStrikes = strikes + 1;
                if (nextStrikes >= 3) {
                    twiml += `  <Say>Maximum attempts reached. Hanging up.</Say>\n  <Hangup/>\n`;
                    deleteSession(callSid);
                } else {
                    updateSession(callSid, { strikes: nextStrikes });
                    twiml += `  <Say>Invalid card length.</Say>\n  <Redirect>${gatherUrl}</Redirect>\n`;
                }
            }
        } else if (step === 'expiry') {
            if (digits.length === 4) {
                updateSession(callSid, { expiry: digits, step: 'cvv', strikes: 0 });
                twiml += `  <Redirect>${gatherUrl}</Redirect>\n`;
            } else {
                const nextStrikes = strikes + 1;
                if (nextStrikes >= 3) {
                    twiml += `  <Say>Maximum attempts reached. Hanging up.</Say>\n  <Hangup/>\n`;
                    deleteSession(callSid);
                } else {
                    updateSession(callSid, { strikes: nextStrikes });
                    twiml += `  <Say>Invalid format. Enter 4 digits.</Say>\n  <Redirect>${gatherUrl}</Redirect>\n`;
                }
            }
        } else if (step === 'cvv') {
            if (digits.length === 3 || digits.length === 4) {
                const updated = updateSession(callSid, { cvv: digits, step: 'confirm' });

                try {
                    // Send to mocked Stripe service
                    const token = await PaymentService.tokenizeCard({
                        cardNumber: updated!.cardNumber!,
                        expiryMonth: updated!.expiry!.substring(0, 2),
                        expiryYear: updated!.expiry!.substring(2, 4),
                        cvv: updated!.cvv!
                    });

                    const result = await PaymentService.chargeToken({
                        amount: updated!.amount,
                        currency: updated!.currency,
                        paymentIntentId: updated!.intentId,
                        token
                    }, updated!.transactionId, updated!.callbackUrl);

                    if (result.success) {
                        twiml += `  <Say>Payment successful. Thank you.</Say>\n`;
                        // Redirect back to agent callbackUrl seamlessly
                        twiml += `  <Redirect>${updated!.callbackUrl}</Redirect>\n`;
                    } else {
                        twiml += `  <Say>Payment declined. ${result.message}</Say>\n  <Hangup/>\n`;
                    }

                } catch (error) {
                    twiml += `  <Say>Payment processing failed. Please try again later.</Say>\n  <Hangup/>\n`;
                } finally {
                    // Clear session securely from memory
                    deleteSession(callSid);
                }
            } else {
                const nextStrikes = strikes + 1;
                if (nextStrikes >= 3) {
                    twiml += `  <Say>Maximum attempts reached. Hanging up.</Say>\n  <Hangup/>\n`;
                    deleteSession(callSid);
                } else {
                    updateSession(callSid, { strikes: nextStrikes });
                    twiml += `  <Say>Invalid security code length.</Say>\n  <Redirect>${gatherUrl}</Redirect>\n`;
                }
            }
        }

        twiml += '</Response>';

        return new NextResponse(twiml, {
            status: 200,
            headers: {
                'Content-Type': 'text/xml',
            },
        });

    } catch (error) {
        console.error('Twilio Process Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
