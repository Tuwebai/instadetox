import { Link } from "wouter";
import BrandLogo from "@/components/BrandLogo";

interface MobileNavProps {
  // Props removed as per mobile nav redesign
}

const MobileNav: React.FC<MobileNavProps> = () => {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-20 glass-dark p-4 flex justify-center items-center h-16 border-b border-white/5">
      <Link href="/inicio">
        <BrandLogo className="h-10 transition-transform active:scale-95 cursor-pointer" />
      </Link>
    </div>
  );
};

export default MobileNav;
