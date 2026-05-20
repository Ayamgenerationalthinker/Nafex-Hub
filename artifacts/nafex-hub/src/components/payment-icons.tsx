export function VisaLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 16" className={className} aria-label="Visa" role="img">
      <text x="24" y="13" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize="14" fill="#1A1F71" letterSpacing="-0.5">
        VISA
      </text>
    </svg>
  );
}

export function MastercardLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 30" className={className} aria-label="Mastercard" role="img">
      <circle cx="19" cy="15" r="10" fill="#EB001B" />
      <circle cx="29" cy="15" r="10" fill="#F79E1B" />
      <path d="M24 7.5a10 10 0 010 15 10 10 0 010-15z" fill="#FF5F00" />
    </svg>
  );
}

export function PaystackLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 18" className={className} aria-label="Paystack" role="img">
      <rect x="2" y="2" width="12" height="3" rx="1" fill="#00C3F7" />
      <rect x="2" y="7.5" width="12" height="3" rx="1" fill="#00C3F7" opacity="0.7" />
      <rect x="2" y="13" width="8" height="3" rx="1" fill="#00C3F7" opacity="0.4" />
      <text x="18" y="13" fontFamily="Helvetica, Arial, sans-serif" fontWeight="700" fontSize="11" fill="#011B33">
        paystack
      </text>
    </svg>
  );
}

export function MobileMoneyLogo({ className = "" }: { className?: string }) {
  // MTN-yellow inspired Mobile Money mark (generic, not the official MTN logo)
  return (
    <svg viewBox="0 0 56 24" className={className} aria-label="Mobile Money" role="img">
      <rect x="1" y="1" width="54" height="22" rx="4" fill="#FFCC00" />
      <text x="28" y="11" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontWeight="800" fontSize="7.5" fill="#0A0A0A">
        MOBILE
      </text>
      <text x="28" y="19" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontWeight="800" fontSize="7.5" fill="#0A0A0A">
        MONEY
      </text>
    </svg>
  );
}

export function BankTransferLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className} aria-label="Bank Transfer" role="img" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9 L16 3 L29 9" />
      <line x1="3" y1="11" x2="29" y2="11" />
      <line x1="6" y1="11" x2="6" y2="19" />
      <line x1="12" y1="11" x2="12" y2="19" />
      <line x1="20" y1="11" x2="20" y2="19" />
      <line x1="26" y1="11" x2="26" y2="19" />
      <line x1="2" y1="21" x2="30" y2="21" />
    </svg>
  );
}
