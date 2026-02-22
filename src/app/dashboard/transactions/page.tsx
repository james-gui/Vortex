import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TransactionsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Transactions</h1>
                <p className="text-zinc-400">View your complete, paginated transaction history here.</p>
            </div>

            <Card className="border-zinc-800 bg-black shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg text-white">Full History (Coming Soon)</CardTitle>
                    <CardDescription className="text-zinc-400">
                        This dedicated view will support advanced filtering, filtering by API key, date ranges, and exporting to CSV. For now, your 5 most recent transactions are available on the Overview dashboard.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
