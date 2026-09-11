"use client";

import { useActionState } from "react";
import {
  acceptNdaAction,
  confirmSignatureAction,
  confirmTransferAction,
  mockEscrowAction,
  mockKycAction,
  mockSignDealDocAction,
  recordDataRoomViewAction,
  sendDealMessageAction,
  sendListingMessageAction,
  signLoiAction,
  uploadDataRoomFileAction,
  validateDeedAction,
  type DealFormState,
} from "@/app/actions/deals";
import { submitRetentionReportAction, type RetentionFormState } from "@/app/actions/retention";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: DealFormState = {};

export function NdaButton({ dealId }: { dealId: string }) {
  const [state, action, pending] = useActionState(acceptNdaAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="dealId" value={dealId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Accepter l'accord de confidentialité (mock)"}
      </Button>
      {state.error ? <p className="mt-1 text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

function StageActionButton({
  dealId,
  action,
  label,
}: {
  dealId: string;
  action: (prev: DealFormState, formData: FormData) => Promise<DealFormState>;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction}>
      <input type="hidden" name="dealId" value={dealId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "…" : label}
      </Button>
      {state.error ? <p className="mt-1 text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

export function SignLoiButton({ dealId }: { dealId: string }) {
  return <StageActionButton dealId={dealId} action={signLoiAction} label="Signer la lettre d'intention (mock)" />;
}

export function ValidateDeedButton({ dealId }: { dealId: string }) {
  return <StageActionButton dealId={dealId} action={validateDeedAction} label="Valider le protocole (mock)" />;
}

export function ConfirmSignatureButton({ dealId }: { dealId: string }) {
  return <StageActionButton dealId={dealId} action={confirmSignatureAction} label="Confirmer la signature (mock)" />;
}

export function ConfirmTransferButton({ dealId }: { dealId: string }) {
  return <StageActionButton dealId={dealId} action={confirmTransferAction} label="Confirmer le transfert ORIAS (mock)" />;
}

export function KycButton({ dealId }: { dealId: string }) {
  const [state, action, pending] = useActionState(mockKycAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="dealId" value={dealId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "KYC…" : "Lancer le KYC (mock)"}
      </Button>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

export function EscrowButtons({ dealId }: { dealId: string }) {
  const [state, action, pending] = useActionState(mockEscrowAction, initial);
  return (
    <div className="flex flex-wrap gap-2">
      <form action={action}>
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="intent" value="hold" />
        <Button type="submit" size="sm" disabled={pending}>
          Séquestrer les fonds (mock)
        </Button>
      </form>
      <form action={action}>
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="intent" value="release" />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Libérer (mock)
        </Button>
      </form>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </div>
  );
}

export function SignDocButton({ dealId, documentId }: { dealId: string; documentId: string }) {
  const [state, action, pending] = useActionState(mockSignDealDocAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="documentId" value={documentId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "Signer (mock)"}
      </Button>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

export function MarkDocumentViewedButton({
  dealId,
  documentId,
}: {
  dealId: string;
  documentId: string;
}) {
  const [state, action, pending] = useActionState(recordDataRoomViewAction, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="documentId" value={documentId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "Consulter"}
      </Button>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

export function DataRoomUpload({ dealId }: { dealId: string }) {
  const [state, action, pending] = useActionState(uploadDataRoomFileAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="dealId" value={dealId} />
      <Input name="file" type="file" required className="max-w-xs" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Dépôt…" : "Déposer"}
      </Button>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

export function MessageForm({
  dealId,
  listingId,
  recipients,
  requireRecipient = false,
}: {
  dealId?: string;
  listingId?: string;
  recipients?: { id: string; publicAlias: string }[];
  requireRecipient?: boolean;
}) {
  const action = dealId ? sendDealMessageAction : sendListingMessageAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const onlyRecipient = recipients?.length === 1 ? recipients[0] : null;
  return (
    <form action={formAction} className="grid gap-2">
      {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
      {listingId ? <input type="hidden" name="listingId" value={listingId} /> : null}
      {onlyRecipient ? <input type="hidden" name="recipientId" value={onlyRecipient.id} /> : null}
      {recipients && recipients.length > 1 ? (
        <select
          name="recipientId"
          required={requireRecipient}
          className="flex h-11 rounded-xl border border-line bg-surface-alt px-3 text-[15px]"
          defaultValue={recipients[0]?.id ?? ""}
        >
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.publicAlias.replace(/^#/, "")}
            </option>
          ))}
        </select>
      ) : null}
      <textarea
        name="body"
        required
        rows={3}
        className="w-full rounded-xl border border-line bg-surface-alt px-3 py-2 text-[15px]"
        placeholder="Votre question (pas de numéro de portable)"
      />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer"}
      </Button>
    </form>
  );
}

const retInitial: RetentionFormState = {};

export function RetentionForm({ dealId, transferred }: { dealId: string; transferred: number }) {
  const [state, action, pending] = useActionState(submitRetentionReportAction, retInitial);
  return (
    <form action={action} className="grid max-w-lg gap-3">
      <input type="hidden" name="dealId" value={dealId} />
      <div className="grid gap-1">
        <Label htmlFor="monthIndex">Échéance</Label>
        <select
          id="monthIndex"
          name="monthIndex"
          className="flex h-9 rounded-sm border border-line bg-paper px-2.5 text-sm"
          defaultValue="3"
        >
          <option value="3">M+3</option>
          <option value="6">M+6</option>
          <option value="12">M+12</option>
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="contractsTransferred">Contrats transférés</Label>
        <Input id="contractsTransferred" name="contractsTransferred" defaultValue={String(transferred)} required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="contractsRetained">Contrats conservés</Label>
        <Input id="contractsRetained" name="contractsRetained" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="actualCommissions">Commissions encaissées (€)</Label>
        <Input id="actualCommissions" name="actualCommissions" required />
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Déclarer"}
      </Button>
    </form>
  );
}
