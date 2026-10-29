"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { leadsApi } from "@/shared/api/base";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import type { Lead } from "@/entities/lead/types";

export function WebsiteLeadInfo({ lead }: { lead: Lead }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const submission = lead.website;
    if (!submission) return null;
    async function download() {
        if (!submission || busy) return;
        setBusy(true);
        setError("");
        try {
            if (
                submission.attachment_parts < 1 ||
                submission.attachment_parts > 10 ||
                submission.attachment_size > 5 * 1024 * 1024
            )
                throw new Error("Invalid attachment");
            const parts: ArrayBuffer[] = [];
            for (let index = 0; index < submission.attachment_parts; index++) {
                const response = await leadsApi.websiteAttachment(
                    lead.id,
                    index,
                );
                parts.push(response.data);
            }
            const blob = new Blob(parts, { type: "application/octet-stream" });
            if (blob.size !== submission.attachment_size)
                throw new Error("Invalid attachment size");
            const hash = Array.from(
                new Uint8Array(
                    await crypto.subtle.digest(
                        "SHA-256",
                        await blob.arrayBuffer(),
                    ),
                ),
            )
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join("");
            if (hash !== submission.attachment_sha256)
                throw new Error("Invalid attachment checksum");
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = submission.attachment_name;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setError("Не удалось скачать вложение. Попробуйте ещё раз.");
        } finally {
            setBusy(false);
        }
    }
    return (
        <Card>
            <h2 className="font-semibold text-surface-900 dark:text-white">
                Заявка с сайта DEO CORE
            </h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                    <dt className="text-surface-500">Тип проекта</dt>
                    <dd>{submission.project_type}</dd>
                </div>
                <div>
                    <dt className="text-surface-500">Бюджет</dt>
                    <dd>{submission.budget_label}</dd>
                </div>
                <div>
                    <dt className="text-surface-500">Срок</dt>
                    <dd>{submission.timeline_label}</dd>
                </div>
            </dl>
            {submission.original_contact && (
                <p className="mt-3 text-sm text-surface-500">
                    Контакт из формы: {submission.original_contact}
                </p>
            )}
            {submission.has_attachment ? (
                <Button
                    className="mt-4"
                    variant="secondary"
                    onClick={download}
                    disabled={busy}
                >
                    {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    {submission.attachment_name}
                </Button>
            ) : submission.attachment_name ? (
                <p className="mt-4 text-sm text-surface-500">
                    Вложение ещё передаётся с сайта.
                </p>
            ) : null}
            {error && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                    {error}
                </p>
            )}
            {!!Object.keys(submission.utm).length && (
                <details className="mt-4 text-sm text-surface-500">
                    <summary className="cursor-pointer">
                        Источник перехода и UTM
                    </summary>
                    <dl className="mt-2 space-y-1">
                        {Object.entries(submission.utm).map(([key, value]) => (
                            <div key={key}>
                                <dt className="inline">{key}: </dt>
                                <dd className="inline break-all">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    {submission.referrer && (
                        <p className="mt-2 break-all">
                            Referrer: {submission.referrer}
                        </p>
                    )}
                </details>
            )}
        </Card>
    );
}
