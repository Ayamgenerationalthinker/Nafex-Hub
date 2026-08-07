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
  size = "lg",
  showTagline = false,
}: LogoProps) {
  const siteSettings = useSiteSettings();
  const logoUrl = siteSettings.logo || "/nafex-logo.svg";

  const heightClasses = {
    sm: "h-10 sm:h-12",
    md: "h-14 sm:h-16",
    lg: "h-16 sm:h-20",
    xl: "h-22 sm:h-26",
  }[size];

  const logoMarkup = (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <img
        src={logoUrl}
        alt="Nafex Hub"
        className={`${heightClasses} max-w-full object-contain transition-transform duration-200 hover:scale-[1.03] ${imgClassName}`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/nafex-logo.svg";
        }}
      />
      {showTagline && (
        <span className="text-[11px] text-[#6B7280] font-medium tracking-wide mt-1 font-poppins">
          Quality products • Secure payments • Fast delivery
        </span>
      )}
    </div>
  );

  if (variant === "badge") {
    return (
      <div className={`bg-white rounded-2xl px-4 py-2 shadow-sm border border-purple-100 inline-flex items-center justify-center shrink-0 hover:shadow-md transition-all ${className}`}>
        {logoMarkup}
      </div>
    );
  }

  if (variant === "dark-badge") {
    return (
      <div className={`bg-[#4A126B] text-white rounded-2xl px-4 py-2.5 shadow-sm border border-purple-800/80 inline-flex items-center justify-center shrink-0 hover:shadow-md transition-all ${className}`}>
        {logoMarkup}
      </div>
    );
  }

  return logoMarkup;
}
