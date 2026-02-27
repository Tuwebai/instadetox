import { cn } from "@/lib/utils";

type BrandLogoVariant = "wordmark" | "icon";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  alt?: string;
}

const BrandLogo = ({ variant = "wordmark", className, alt = "InstaDetox" }: BrandLogoProps) => {
  const src = variant === "icon" ? "/brand-icon.png" : "/brand-wordmark.png";

  return <img src={src} alt={alt} className={cn("block w-auto", className)} decoding="async" />;
};

export default BrandLogo;
