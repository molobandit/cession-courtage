"use client";

import { useActionState } from "react";
import { consumeEmailCodeAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: FormState = {};

export function EmailCodeForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(consumeEmailCodeAction, initial);

  return (
    <form action={action} className="mt-6 grid gap-3">
      <input type="hidden" name="email" value={email} />
      <div className="grid gap-1">
        <Label htmlFor="code">Code reçu par e-mail</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          minLength={6}
          maxLength={6}
          pattern="\d{6}"
          required
          placeholder="000000"
        />
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Vérification…" : "Valider le code"}
      </Button>
    </form>
  );
}
