import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

interface InstagramMediaPickerProps {
  mediaUrls: string[];
  isUploadingMedia: boolean;
  isVideoUrl: (url: string) => boolean;
  onOpenPreview: (index: number) => void;
  onRemoveMedia: (url: string) => void;
  onUploadFiles: (files: FileList | null) => Promise<void>;
}

const InstagramMediaPicker = ({
  mediaUrls,
  isUploadingMedia,
  isVideoUrl,
  onOpenPreview,
  onRemoveMedia,
  onUploadFiles,
}: InstagramMediaPickerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="ig-create-media-stage">
      <div className="ig-create-media-header">Crear nueva publicación</div>
      <div
        className={`ig-create-media-body${isDragging ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void onUploadFiles(event.dataTransfer.files);
        }}
      >
        {mediaUrls.length === 0 ? (
          <div className="ig-create-empty">
            <ImagePlus className="ig-create-empty-icon" />
            <p className="ig-create-empty-text">Arrastra las fotos y los videos aquí</p>
            <button
              type="button"
              onClick={openFilePicker}
              disabled={isUploadingMedia}
              className="ig-create-upload-btn"
            >
              {isUploadingMedia ? "Subiendo..." : "Seleccionar de la computadora"}
            </button>
          </div>
        ) : (
          <div className="ig-create-selected-wrap">
            <div className="ig-create-selected-grid">
              {mediaUrls.map((url) => (
                <div
                  key={url}
                  className="ig-create-selected-item"
                  onClick={() => onOpenPreview(mediaUrls.findIndex((item) => item === url))}
                >
                  {isVideoUrl(url) ? (
                    <video src={url} className="ig-create-selected-media" muted preload="metadata" />
                  ) : (
                    <img src={url} alt="Media seleccionada" className="ig-create-selected-media" />
                  )}
                  <button
                    type="button"
                    className="ig-create-remove-media"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveMedia(url);
                    }}
                    aria-label="Eliminar media"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={openFilePicker}
              disabled={isUploadingMedia}
              className="ig-create-upload-btn"
            >
              {isUploadingMedia ? "Subiendo..." : "Agregar más"}
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void onUploadFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
};

export default InstagramMediaPicker;
