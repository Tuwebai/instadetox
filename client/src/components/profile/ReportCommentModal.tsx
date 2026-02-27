import { ChevronRight, X } from "lucide-react";

interface ReportCommentModalProps {
  open: boolean;
  reportReasons: readonly string[];
  submittingReason: string | null;
  onClose: () => void;
  onReport: (reason: string) => void | Promise<void>;
}

const ReportCommentModal = ({
  open,
  reportReasons,
  submittingReason,
  onClose,
  onReport,
}: ReportCommentModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-[640px] max-h-[82vh] rounded-2xl overflow-hidden border border-white/15 bg-slate-900/95 flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-12 border-b border-white/10 flex items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md border border-white/30 hover:bg-white/10 disabled:opacity-50"
            aria-label="Cerrar"
            disabled={Boolean(submittingReason)}
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-[16px] font-semibold text-white">Reportar</h3>
        </div>

        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-base font-semibold text-white">¿Por qué quieres reportar este comentario?</p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-invisible">
          {reportReasons.map((reason) => {
            const busy = submittingReason === reason;
            return (
              <button
                key={`report-reason-${reason}`}
                type="button"
                onClick={() => void onReport(reason)}
                disabled={Boolean(submittingReason)}
                className="w-full h-12 px-4 flex items-center justify-between border-b border-white/10 text-sm text-white hover:bg-white/5 disabled:opacity-60"
              >
                <span className="text-left">{busy ? "Enviando..." : reason}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReportCommentModal;
