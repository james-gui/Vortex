import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/twilioSession';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const callSid = formData.get('CallSid') as string;

        if (!callSid) {
            return new NextResponse('Missing CallSid', { status: 400 });
        }

        const session = getSession(callSid);

        let twiml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';

        if (!session) {
            twiml += `  <Say>Error. No active payment session found for this call. Please try again.</Say>\n`;
            twiml += `  <Hangup/>\n`;
        } else {
            const { step } = session;
            const processUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vortex.test'}/api/twilio/process`;

            // pciCompliance="true" prevents Twilio from logging the DTMF inputs in their console logs
            twiml += `  <Gather action="${processUrl}" method="POST" pciCompliance="true" timeout="10">\n`;

            if (step === 'card') {
                twiml += `    <Say>Please enter your 16 digit card number, followed by the pound sign.</Say>\n`;
            } else if (step === 'expiry') {
                twiml += `    <Say>Please enter your card expiration date as 4 digits, month and year, followed by the pound sign.</Say>\n`;
            } else if (step === 'cvv') {
                twiml += `    <Say>Please enter your 3 or 4 digit security code, followed by the pound sign.</Say>\n`;
            }

            twiml += `  </Gather>\n`;
            // Fallback if Gather times out without user input
            twiml += `  <Say>We didn't receive any input. Goodbye.</Say>\n`;
            twiml += `  <Hangup/>\n`;
        }

        twiml += '</Response>';

        return new NextResponse(twiml, {
            status: 200,
            headers: {
                'Content-Type': 'text/xml',
            },
        });
    } catch (error) {
        console.error('Twilio Gather Error:', error); // Ok to log, does not contain PCI data
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export const GET = POST; // Twilio often sends GET for webhooks during testing/fallback
