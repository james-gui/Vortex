"use server";

import { currentUser } from "@clerk/nextjs/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createApiKey() {
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

    // Generate a secure 32 byte secret (64 characters hex)
    const rawSecret = crypto.randomBytes(32).toString("hex");
    const rawKey = `vtx_live_${rawSecret}`;

    // Hash it for DB storage so the full key is never stored, 
    // exactly matching what POST /intent expects
    const key_hashed = crypto.createHash('sha256').update(rawKey).digest('hex');

    // So the UI can show "vtx_live_abcd..."
    const prefix = rawKey.substring(0, 13);

    await prisma.apiKey.create({
        data: {
            org_id: org.id,
            name: "Secret API Key",
            key_hashed,
            prefix,
            is_live: true,
        }
    });

    revalidatePath("/dashboard");
    return rawKey;
}
