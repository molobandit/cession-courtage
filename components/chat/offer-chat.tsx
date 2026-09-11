"use client";

import { MessageForm } from "@/components/deal/deal-forms";

export type ChatLine = {
  id: string;
  body: string;
  createdLabel: string;
  senderId: string;
  senderAlias: string;
};

export function OfferChat({
  listingId,
  dealId,
  actorId,
  messages,
  recipients,
}: {
  listingId?: string;
  dealId?: string;
  actorId: string;
  messages: ChatLine[];
  recipients?: { id: string; publicAlias: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-line bg-paper">
      <div className="max-h-[28rem] space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
        {messages.length === 0 ? (
          <p className="text-[15px] text-muted">Aucun message pour le moment. Posez votre première question.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === actorId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    mine ? "bg-indigo text-white" : "bg-surface-alt text-ink"
                  }`}
                >
                  <p className={`text-[11px] ${mine ? "text-white/80" : "text-muted"}`}>
                    {m.senderAlias.replace(/^#/, "")} · {m.createdLabel}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-line p-4">
        <p className="mb-3 text-[13px] leading-relaxed text-muted">
          Échangez ici. Les numéros de portable (06, 07, +33 6, +33 7) sont bloqués,
          pour que la négociation ne sorte pas du site.
        </p>
        <MessageForm
          dealId={dealId}
          listingId={listingId}
          recipients={recipients}
          requireRecipient={Boolean(recipients && recipients.length > 0)}
        />
      </div>
    </div>
  );
}
