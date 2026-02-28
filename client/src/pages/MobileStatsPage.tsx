import RightPanel from "@/components/RightPanel";
import { Glass } from "@/components/ui/glass";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

const MobileStatsPage = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="animate-in fade-in slide-in-from-right duration-300 pb-20">
      {/* Header simple para volver */}
      <div className="flex items-center p-4 mb-2 sticky top-0 z-10 glass-dark">
        <button 
          onClick={() => setLocation("/inicio")}
          className="mr-4 p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold">Tu Detox</h2>
      </div>

      <div className="px-4">
        <RightPanel />
      </div>
    </div>
  );
};

export default MobileStatsPage;
