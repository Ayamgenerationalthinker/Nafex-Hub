import { useSiteSettings } from "@/hooks/use-site-settings";

interface LogoProps {
  className?: string;
  imgClassName?: string;
  variant?: "badge" | "raw" | "dark-badge" | "full";
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
}

export function Logo({
  className = "",
  imgClassName = "",
  variant = "raw",
  size = "md",
  showTagline = false,
}: LogoProps) {
  const siteSettings = useSiteSettings();
  const logoUrl = siteSettings.logo || "/nafex-logo.svg";

  const heightClasses = {
    sm: "h-7 sm:h-8",
    md: "h-9 sm:h-11",
    lg: "h-12 sm:h-14",
    xl: "h-16 sm:h-20",
  }[size];

  const logoMarkup = (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <img
        src={logoUrl}
        alt="Nafex Hub"
        className={`${heightClasses} w-auto object-contain transition-transform duration-200 hover:scale-[1.02] ${imgClassName}`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/nafex-logo.svg";
        }}
      />
      {showTagline && (
        <span className="text-[10px] text-[#6B7280] font-medium tracking-wide mt-1 font-poppins">
          Quality products • Secure payments • Fast delivery
        </span>
      )}
    </div>
  );

  if (variant === "badge") {
    return (
      <div className={`bg-white rounded-2xl px-3 py-1.5 shadow-xs border border-purple-100/80 inline-flex items-center justify-center shrink-0 hover:shadow-sm transition-all ${className}`}>
        {logoMarkup}
      </div>
    );
  }

  if (variant === "dark-badge") {
    return (
      <div className={`bg-[#4A126B] text-white rounded-2xl px-3.5 py-2 shadow-xs border border-purple-800/80 inline-flex items-center justify-center shrink-0 hover:shadow-sm transition-all ${className}`}>
        {logoMarkup}
      </div>
    );
  }

  return logoMarkup;
}
