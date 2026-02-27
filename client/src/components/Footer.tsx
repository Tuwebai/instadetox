import React from "react";
import { Link } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

const Footer = ({ className }: FooterProps) => {
  return (
    <footer className={cn("glass-dark py-4 px-4 sm:px-6", className)}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="mb-4 md:mb-0 flex items-center gap-3">
          <BrandLogo className="h-12" />
          <span className="text-sm text-gray-400">© 2026 InstaDetox. Todos los derechos reservados.</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/mas" className="text-sm text-gray-400 hover:text-white transition-colors">
            Términos
          </Link>
          <a
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Privacidad
          </a>
          <a href="mailto:soporte@instadetox.app" className="text-sm text-gray-400 hover:text-white transition-colors">
            Contacto
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
