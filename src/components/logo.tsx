import { useSiteSettings } from "@/hooks/use-site-settings";

interface LogoProps {
  className?: string;
  imgClassName?: string;
  variant?: "badge" | "raw" | "dark-badge";
  size?: "sm" | "md" | "lg";
}

export function Logo({
  className = "",
  imgClassName = "",
  variant = "badge",
  size = "md",
}: LogoProps) {
  const siteSettings = useSiteSettings();
  const logoUrl = siteSettings.logo || "/nafex-logo.png";

  const sizeClasses = {
    sm: "h-7 max-h-7",
    md: "h-9 max-h-9",
    lg: "h-12 max-h-12",
  }[size];

  if (variant === "badge") {
    return (
      <div className={`bg-white rounded-xl px-3 py-1.5 shadow-sm border border-slate-200/80 inline-flex items-center justify-center shrink-0 hover:shadow-md transition-all ${className}`}>
        <img
          src={logoUrl}
          alt="Nafex Hub"
          className={`w-auto object-contain ${sizeClasses} ${imgClassName}`}
        />
      </div>
    );
  }

  if (variant === "dark-badge") {
    return (
      <div className={`bg-slate-950/80 rounded-xl px-3 py-1.5 shadow-sm border border-slate-800/80 inline-flex items-center justify-center shrink-0 hover:shadow-md transition-all ${className}`}>
        <img
          src={logoUrl}
          alt="Nafex Hub"
          className={`w-auto object-contain ${sizeClasses} ${imgClassName}`}
        />
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt="Nafex Hub"
      className={`w-auto object-contain ${sizeClasses} ${imgClassName} ${className}`}
    />
  );
}
