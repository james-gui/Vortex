import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Copy, CreditCard, Activity, Settings, UserCircle } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-black text-zinc-50 flex flex-col font-sans selection:bg-blue-500/30">
            <header className="border-b border-zinc-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50 h-16">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-full">
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(37,99,235,0.5)] group-hover:shadow-[0_0_20px_rgba(37,99,235,0.7)] transition-all">
                                V
                            </div>
                            <span className="text-xl font-semibold tracking-tight text-white">Vortex</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            <Link href="/dashboard" className="px-3 py-2 text-sm font-medium rounded-md bg-zinc-800/50 text-white transition-colors">
                                Overview
                            </Link>
                            <Link href="/dashboard/transactions" className="px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors">
                                Transactions
                            </Link>
                            <Link href="/dashboard/settings" className="px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors">
                                Settings
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8 border border-zinc-700 hover:border-zinc-500 transition-colors"
                                }
                            }}
                        />
                    </div>
                </div>
            </header>
            <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
                {children}
            </main>
        </div>
    );
}
