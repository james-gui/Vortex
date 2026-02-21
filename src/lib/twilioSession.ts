export type GatherStep = 'card' | 'expiry' | 'cvv' | 'confirm';

export interface TwilioSession {
    callSid: string;
    step: GatherStep;
    strikes: number;
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
    amount: string; // from intent
    currency: string;
    intentId: string; // stripe intent id
    transactionId: string; // our internal db transaction id
    callbackUrl: string;
}

// In-memory store: Map CallSid -> Session
// Note: In a true multi-instance production environment, this would be backed by Redis or similar
// with strict TTLs, but for this PRD scope an in-memory Map handles the core flow correctly without DB logging.
const sessions = new Map<string, TwilioSession>();

export function getSession(callSid: string): TwilioSession | undefined {
    return sessions.get(callSid);
}

export function createSession(callSid: string, sessionConfig: Omit<TwilioSession, 'callSid' | 'step' | 'strikes'>): TwilioSession {
    const session: TwilioSession = {
        ...sessionConfig,
        callSid,
        step: 'card',
        strikes: 0,
    };
    sessions.set(callSid, session);
    return session;
}

export function updateSession(callSid: string, updates: Partial<TwilioSession>): TwilioSession | undefined {
    const session = sessions.get(callSid);
    if (!session) return undefined;

    const updated = { ...session, ...updates };
    sessions.set(callSid, updated);
    return updated;
}

export function deleteSession(callSid: string): void {
    sessions.delete(callSid);
}
