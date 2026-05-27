export interface PaystackResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
}

declare global {
  interface Window {
    PaystackPop: {
      setup(options: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        currency?: string;
        onSuccess: (response: PaystackResponse) => void;
        onClose: () => void;
      }): { openIframe(): void };
    };
  }
}

let _cachedPublicKey: string | null = null;

export async function getPaystackPublicKey(): Promise<string> {
  if (_cachedPublicKey) return _cachedPublicKey;
  const res = await fetch("/api/config/paystack");
  if (!res.ok) throw new Error("Could not load payment configuration. Please try again.");
  const data = (await res.json()) as { publicKey: string | null };
  if (!data.publicKey) {
    throw new Error("Payments are not yet configured. Please contact support.");
  }
  _cachedPublicKey = data.publicKey;
  return _cachedPublicKey;
}

export function openPaystackPopup(opts: {
  publicKey: string;
  email: string;
  amountPesewas: number;
  reference: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}): void {
  if (!window.PaystackPop) {
    throw new Error("Paystack script failed to load. Please refresh the page and try again.");
  }
  const handler = window.PaystackPop.setup({
    key: opts.publicKey,
    email: opts.email,
    amount: opts.amountPesewas,
    ref: opts.reference,
    currency: "GHS",
    onSuccess: (response) => {
      console.log("[Paystack] Payment successful, reference:", response.reference);
      opts.onSuccess(response.reference);
    },
    onClose: () => {
      console.log("[Paystack] Payment popup closed by user");
      opts.onClose();
    },
  });
  handler.openIframe();
}
