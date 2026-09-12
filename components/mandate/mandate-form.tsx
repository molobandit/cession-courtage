"use client";

import { useActionState } from "react";
import { createMandateAction, type MandateFormState } from "@/app/actions/mandates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RISK_TYPE_LABELS, SEGMENT_LABELS } from "@/lib/labels";
import { RiskType, ClientSegment } from "@prisma/client";

const initial: MandateFormState = {};
const selectClass =
  "flex h-9 w-full rounded-sm border border-line bg-paper px-2.5 text-sm outline-none focus:border-navy";

export function MandateForm({
  publish = false,
  submitLabel,
}: {
  publish?: boolean;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(createMandateAction, initial);
  return (
    <form action={action} className="grid max-w-2xl gap-3">
      {publish ? <input type="hidden" name="publish" value="true" /> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor="maxBudget">Budget max (€)</Label>
          <Input id="maxBudget" name="maxBudget" required defaultValue="80000" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="minCommissions">Commissions min (€/an)</Label>
          <Input id="minCommissions" name="minCommissions" required defaultValue="10000" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="maxCommissions">Commissions max (€/an)</Label>
          <Input id="maxCommissions" name="maxCommissions" required defaultValue="50000" />
        </div>
      </div>
      <div className="grid gap-1">
        <Label>Branches visées</Label>
        <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
          {(Object.keys(RISK_TYPE_LABELS) as RiskType[]).map((key) => (
            <label key={key} className="flex items-center gap-1.5">
              <input type="checkbox" name="riskTypes" value={key} defaultChecked={key === "HEALTH_INDIVIDUAL"} />
              {RISK_TYPE_LABELS[key]}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="carriers">Compagnies (séparées par des virgules)</Label>
        <Input id="carriers" name="carriers" placeholder="AXA, Allianz, April" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="zones">Zones (NATIONAL, IDF, 75…)</Label>
        <Input id="zones" name="zones" required defaultValue="NATIONAL" />
      </div>
      <div className="grid gap-1">
        <Label>Segments</Label>
        <div className="flex flex-wrap gap-3 text-sm">
          {(Object.keys(SEGMENT_LABELS) as ClientSegment[]).map((key) => (
            <label key={key} className="flex items-center gap-1.5">
              <input type="checkbox" name="clientSegments" value={key} defaultChecked={key === "INDIVIDUAL"} />
              {SEGMENT_LABELS[key]}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="financingMode">Financement</Label>
        <select id="financingMode" name="financingMode" className={selectClass} defaultValue="BOTH">
          <option value="CASH">Comptant</option>
          <option value="CREDIT">Crédit</option>
          <option value="BOTH">Les deux</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="alertsEnabled" defaultChecked />
        Alertes e-mail (boîte mock)
      </label>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : submitLabel ?? "Enregistrer le mandat"}
      </Button>
    </form>
  );
}
