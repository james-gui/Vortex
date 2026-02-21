# System Context & Product Requirements: Vortex

## 1. System Overview
Vortex is a PCI-compliant, API-first middleware layer designed to enable AI voice agents (Vapi, Retell, Custom WebSockets) to securely process credit card payments mid-conversation. 

The system intercepts an active telephony session to capture secure keypad input (DTMF), tokenizes the sensitive data directly via Stripe (minimizing infrastructure PCI scope), and returns a structured event to the parent AI agent so the conversation can resume with full context of the payment outcome.

## 2. Tech Stack & Architecture
* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript (Strict mode)
* **Styling:** Tailwind CSS, shadcn/ui
* **Database:** PostgreSQL (Supabase)
* **ORM:** Prisma
* **Telephony:** Twilio (TwiML `<Gather>` with `pciCompliance="true"`)
* **Payments:** Stripe API (Stripe Connect - Destination Charges)
* **Authentication:** Clerk (Developer Dashboard & User Management)

## 3. Database Schema Requirements (Prisma)
The database supports multi-tenant developers with isolated transaction logs.

* **Organization:** `id`, `name`, `stripe_connect_account_id`, `onboarding_complete` (bool), `created_at`
* **ApiKey:** `id`, `org_id`, `name`, `key_hashed`, `prefix`, `is_live`, `last_used_at`, `created_at`
* **Transaction:** `id`, `org_id`, `amount`, `currency`, `status` (pending, succeeded, failed, canceled), `stripe_pi_id`, `error_code`, `error_message`, `metadata` (JSON), `created_at`, `completed_at`
* **WebhookEndpoint:** `id`, `org_id`, `url`, `secret`, `active` (bool)

## 4. Core API Workflows & Logic

### Flow A: Initiating a Payment Intent
1.  **Request:** AI Agent calls `POST /api/v1/payments/intent` with `call_sid`, `amount`, and `callback_url`.
2.  **Auth:** Validate `X-API-Key` header against `ApiKey` table.
3.  **Action:** Create a Stripe `PaymentIntent` via Stripe Connect (Destination Charge) to allow for platform fee collection.
4.  **Response:** Return `transaction_id` and a `redirect_url` pointing to Vortex's TwiML handler.

### Flow B: Secure DTMF Capture (The "TwiML Bridge")
1.  **Entry:** Twilio redirects the call to Vortex. Vortex responds with TwiML `<Gather>` for the 16-digit card number. 
2.  **Logic:** 
    *   Implementation of a 3-strike retry loop: If digits are invalid or Stripe tokenization fails, Vortex prompts the user to re-enter.
    *   **Sub-Flow:** Sequentially gather Card Number -> Expiry -> CVV.
3.  **Tokenization:** Vortex calls Stripe's `Tokens` API in-memory. **RAW CARD DATA IS NEVER LOGGED OR PERSISTED.**
4.  **Confirmation:** Confirm the `PaymentIntent` using the generated token.

### Flow C: Handoff & Resumption
1.  **Webhook:** Fire a `payment.succeeded` or `payment.failed` webhook to the developer's `callback_url`.
2.  **Bridge Back:** Respond to the final Twilio request with a TwiML `<Redirect>` back to the Original AI Agent's endpoint (or a TwiML `<Play>` confirming success before hanging up/transferring).

## 5. Implementation Phases

* **Phase 1: Foundation.** Project init + Prisma schema for multi-tenancy.
* **Phase 2: Stripe Connect & Dashboard.** Clerk auth integration. Stripe Connect Standard/Express onboarding flow for developers to link their accounts.
* **Phase 3: Core Payment API.** The secure `/intent` endpoint and API Key management UI.
* **Phase 4: Telephony Middleware.** Secure TwiML endpoints (`/gather`, `/process`) with retry loops and PCI logging disabled.
* **Phase 5: Secure Tokenization.** Integration with Stripe's backend to convert DTMF strings into one-time payment tokens.
* **Phase 6: Observability.** Transaction dashboard for developers to see live payment logs and debug webhook delivery.

## 6. Technical Constraints & Non-Goals
* **PCI Isolation:** Raw card numbers must exist only in-memory during the Stripe API request. Ensure `pciCompliance="true"` is set on Twilio `<Gather>` to scrub digits from Twilio console.
* **Resiliency:** Handle "Hanging Up" mid-payment; ensure Stripe PaymentIntents are canceled or updated if the user disconnects.
* **Non-Goal:** We are not building a voice synthesiser or NLU. Vortex only speaks to "capture and confirm."
