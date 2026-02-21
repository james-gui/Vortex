import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, CreditCard, Copy, CheckCircle2, Activity, Plus } from "lucide-react";
import { revalidatePath } from "next/cache";

// Server action to create a new API Key
async function generateApiKey(formData: FormData) {
    "use server";
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    let org = await prisma.organization.findFirst({
        where: { name: user.id }
    });

    if (!org) {
        org = await prisma.organization.create({
            data: { name: user.id }
        });
    }

    const name = formData.get("name") as string || "Default API Key";
    const key_hashed = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const prefix = "vtx_live_" + key_hashed.substring(0, 8);

    await prisma.apiKey.create({
        data: {
            org_id: org.id,
            name,
            key_hashed,
            prefix,
            is_live: true,
        }
    });

    revalidatePath("/dashboard");
}

export default async function DashboardPage() {
    const user = await currentUser();
    if (!user) {
        // If not using Clerk middleware extensively, try a manual redirect
        redirect("/sign-in");
    }

    // Fetch org based on user.id or fallback
    let org = await prisma.organization.findFirst({
        where: { name: user.id },
        include: {
            api_keys: { orderBy: { created_at: 'desc' } },
            transactions: { orderBy: { created_at: 'desc' }, take: 5 }
        }
    });

    if (!org) {
        org = await prisma.organization.create({
            data: { name: user.id },
            include: { api_keys: true, transactions: true }
        });
    }

    const stripeConnected = org.stripe_connect_account_id !== null;

    return (
        <div className="flex flex-col gap-10">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Welcome back, {user.firstName || "Developer"}</h1>
                <p className="text-zinc-400">Manage your Vortex integration, API keys, and monitor live transactions.</p>
            </div>

            {!stripeConnected && (
                <Card className="border-0 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent pointer-events-none" />
                    <CardHeader className="relative z-10 pb-2">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-blue-400" />
                            </div>
                            <CardTitle className="text-xl text-white">Connect Stripe Account</CardTitle>
                        </div>
                        <CardDescription className="text-zinc-300 text-base max-w-2xl">
                            Vortex needs to connect to your Stripe account to process one-time tokens and destination charges securely. We never store raw credit card data.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="relative z-10 pt-4">
                        <a href={`https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_mock&scope=read_write`}>
                            <Button className="bg-white text-black hover:bg-zinc-200 transition-colors group px-6 font-medium font-sans">
                                Connect with Stripe
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </a>
                    </CardFooter>
                </Card>
            )}

            {stripeConnected && (
                <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <CardTitle className="text-lg text-white">Stripe Accounts Linked</CardTitle>
                        </div>
                        <CardDescription className="text-zinc-400">
                            Your platform is ready to process secure DTMF payments through Vortex.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column - API Keys */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">API Keys</h2>
                        <form action={generateApiKey}>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer">
                                <Plus className="w-3.5 h-3.5" />
                                <span>New Key</span>
                            </Button>
                        </form>
                    </div>

                    <Card className="border-zinc-800 bg-black shadow-lg">
                        <div className="flex flex-col">
                            {org.api_keys.length === 0 ? (
                                <div className="p-6 text-center text-sm text-zinc-500">
                                    No API keys generated yet.
                                </div>
                            ) : (
                                org.api_keys.map((key, i) => (
                                    <div key={key.id} className={`p-5 flex flex-col gap-3 ${i !== org.api_keys.length - 1 ? 'border-b border-zinc-800' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-zinc-200">{key.name}</span>
                                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-normal">
                                                Live
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between bg-zinc-900/80 rounded-md p-2 border border-zinc-800">
                                            <code className="text-sm font-mono text-zinc-400 ml-1">
                                                {key.prefix}...{key.key_hashed.slice(-4)}
                                            </code>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer">
                                                <Copy className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                        <div className="text-xs text-zinc-600 mt-1">
                                            Created {new Date(key.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Column - Transactions */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
                        <Button size="sm" variant="link" className="text-blue-400 hover:text-blue-300 cursor-pointer p-0">
                            View all
                        </Button>
                    </div>

                    <Card className="border-zinc-800 bg-black shadow-lg overflow-hidden">
                        <Table>
                            <TableHeader className="bg-zinc-900/50 hover:bg-zinc-900/50">
                                <TableRow className="border-zinc-800">
                                    <TableHead className="text-zinc-400 font-medium">Amount</TableHead>
                                    <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                                    <TableHead className="text-zinc-400 font-medium">Date</TableHead>
                                    <TableHead className="text-zinc-400 font-medium text-right">Transaction ID</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {org.transactions.length === 0 ? (
                                    <TableRow className="hover:bg-transparent border-0">
                                        <TableCell colSpan={4} className="text-center py-12 text-zinc-500">
                                            <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                            <p>No transactions found</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    org.transactions.map((tx) => (
                                        <TableRow key={tx.id} className="border-zinc-800 hover:bg-zinc-900/30 transition-colors">
                                            <TableCell className="font-medium text-zinc-200">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: tx.currency.toUpperCase() }).format(tx.amount / 100)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`font-normal ${tx.status === 'succeeded' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                                                        tx.status === 'failed' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                                            'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                                    }`}>
                                                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-zinc-400">
                                                {new Date(tx.created_at).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell className="text-right text-zinc-500 font-mono text-sm">
                                                {tx.id.split('-')[0]}...
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            </div>
        </div>
    );
}
