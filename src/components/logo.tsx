import { ShoppingBag } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

interface LogoProps {
  className?: string;
  imgClassName?: string;
  variant?: "badge" | "raw" | "dark-badge" | "full";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export function Logo({
  className = "",
  imgClassName = "",
  variant = "badge",
  size = "md",
  showTagline = false,
}: LogoProps) {
  const siteSettings = useSiteSettings();

  const sizeClasses = {
    sm: { icon: "h-5 w-5", text: "text-lg", tagline: "text-[9px]" },
    md: { icon: "h-7 w-7", text: "text-xl", tagline: "text-[10px]" },
    lg: { icon: "h-9 w-9", text: "text-2xl", tagline: "text-xs" },
  }[size];

  const logoMarkup = (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <div className="inline-flex items-center gap-2 font-poppins font-bold tracking-tight">
        {/* Shopping bag icon styled after the image */}
        <div className="relative inline-flex items-center justify-center p-1.5 rounded-lg bg-[#6A1B9A] text-white shadow-sm">
          <ShoppingBag className={`${sizeClasses.icon} text-white`} />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#D4A017]" />
        </div>
        <div className={sizeClasses.text}>
          <span className="text-[#6A1B9A]">Nafex</span>
          <span className="text-[#D4A017]">Hub..</span>
        </div>
      </div>
      {showTagline && (
        <span className={`text-[#6B7280] font-medium tracking-wide mt-0.5 ${sizeClasses.tagline}`}>
          Quality products • Secure payments • Fast delivery
        </span>
      )}
    </div>
  );

  if (variant === "badge") {
    return (
      <div className={`bg-white rounded-xl px-3 py-1.5 shadow-sm border border-purple-100 inline-flex items-center justify-center shrink-0 hover:shadow-md transition-all ${className}`}>
        {logoMarkup}
      </div>
    );
  }

  if (variant === "dark-badge") {
    return (
      <div className={`bg-[#4A126B] text-white rounded-xl px-3 py-1.5 shadow-sm border border-purple-800/80 inline-flex items-center justify-center shrink-0 hover:shadow-md transition-all ${className}`}>
        {logoMarkup}
      </div>
    );
  }

  return logoMarkup;
}
