import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Settings</h1>
                <p className="text-zinc-400">Manage your Organization and Webhooks.</p>
            </div>

            <Card className="border-zinc-800 bg-black shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg text-white">Organization Settings (Coming Soon)</CardTitle>
                    <CardDescription className="text-zinc-400">
                        This view will allow you to invite team members, configure your Webhook Endpoint URLs for the AI Agents (`/api/v1/payments/intent` callback), and manage your Stripe Connect routing.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
