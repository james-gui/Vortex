import crypto from 'crypto';

export interface WebhookPayload {
    transaction_id: string;
    status: 'succeeded' | 'failed';
    amount: number;
    currency: string;
    error_message?: string;
    metadata?: any;
}

export class WebhookDispatcher {
    /**
     * Dispatches a webhook to the provided callback URL.
     * Optionally signs the payload if a secret is provided.
     */
    static async dispatch(url: string, payload: WebhookPayload, secret?: string): Promise<boolean> {
        if (!url) {
            console.warn('Webhook URL missing, skipping dispatch.');
            return false;
        }

        const timestamp = Date.now().toString();
        const payloadString = JSON.stringify(payload);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Vortex-Timestamp': timestamp,
        };

        if (secret) {
            const signature = crypto
                .createHmac('sha256', secret)
                .update(`${timestamp}.${payloadString}`)
                .digest('hex');
            headers['X-Vortex-Signature'] = signature;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: payloadString,
            });

            if (!response.ok) {
                console.error(`Webhook dispatch failed with status: ${response.status}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Webhook dispatch error:', error);
            return false;
        }
    }
}
