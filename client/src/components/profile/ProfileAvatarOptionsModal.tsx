import { Upload, Trash2 } from "lucide-react";

interface ProfileAvatarOptionsModalProps {
  open: boolean;
  busy: boolean;
  hasAvatar: boolean;
  onClose: () => void;
  onPickFile: () => void;
  onRemoveAvatar: () => void | Promise<void>;
}

const ProfileAvatarOptionsModal = ({
  open,
  busy,
  hasAvatar,
  onClose,
  onPickFile,
  onRemoveAvatar,
}: ProfileAvatarOptionsModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm p-4 flex items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-[420px] rounded-2xl overflow-hidden border border-white/15 bg-slate-900/95"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 py-5 text-center border-b border-white/10">
          <h3 className="text-[20px] font-medium text-white">Cambiar foto del perfil</h3>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onPickFile}
          className="w-full h-14 text-center text-[15px] font-semibold text-blue-400 hover:bg-white/5 transition-colors inline-flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Subir foto
        </button>
        <div className="h-px bg-white/10" />
        <button
          type="button"
          disabled={busy || !hasAvatar}
          onClick={() => void onRemoveAvatar()}
          className="w-full h-14 text-center text-[15px] font-semibold text-red-400 hover:bg-white/5 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar foto actual
        </button>
        <div className="h-px bg-white/10" />
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="w-full h-14 text-center text-[15px] font-medium text-white hover:bg-white/5 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ProfileAvatarOptionsModal;
