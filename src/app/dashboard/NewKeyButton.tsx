"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Check } from "lucide-react";
import { createApiKey } from "./actions";

export default function NewKeyButton() {
    const [newKey, setNewKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCreate = async () => {
        setLoading(true);
        try {
            const key = await createApiKey();
            setNewKey(key);
        } catch (error) {
            console.error("Failed to create key", error);
        }
        setLoading(false);
    };

    const handleCopy = () => {
        if (newKey) {
            navigator.clipboard.writeText(newKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex flex-col items-end gap-2">
            {!newKey ? (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreate}
                    disabled={loading}
                    className="h-8 gap-1.5 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{loading ? "Generating..." : "New Key"}</span>
                </Button>
            ) : (
                <div className="flex flex-col gap-1 items-end mt-2">
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-2 rounded-md shadow-xl w-full justify-between overflow-hidden">
                        <code className="text-xs font-mono truncate w-full">{newKey.substring(0, 16)}...{newKey.slice(-8)}</code>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleCopy}
                            className="h-7 w-7 shrink-0 text-emerald-400 hover:text-white hover:bg-emerald-500/20 cursor-pointer"
                        >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                    </div>
                </div>
            )}
            {newKey && <p className="text-xs text-zinc-500 mt-1">Copy this key now. It won't be shown again.</p>}
        </div>
    );
}
