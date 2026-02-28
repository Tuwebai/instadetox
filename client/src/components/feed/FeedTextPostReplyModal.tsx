import { useEffect, useRef, useState } from "react";
import type { FeedPostCardRow } from "@/components/feed/feedPostTypes";
import { shortTimeAgo } from "@/components/feed/feedPostUtils";
import { useAuth } from "@/lib/AuthContext";

interface FeedTextPostReplyModalProps {
  post: FeedPostCardRow;
  isOpen: boolean;
  onClose: () => void;
  commentInput: string;
  onCommentInputChange: (value: string) => void;
  onSubmitComment: () => void;
  isSubmitting?: boolean;
}

export default function FeedTextPostReplyModal({
  post,
  isOpen,
  onClose,
  commentInput,
  onCommentInputChange,
  onSubmitComment,
  isSubmitting = false,
}: FeedTextPostReplyModalProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onCommentInputChange(e.target.value);
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (commentInput.trim() && !isSubmitting) {
        onSubmitComment();
        onClose(); // Auto close on submit
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[620px] rounded-2xl bg-[#181818] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex items-center justify-center h-[60px] border-b border-white/10 px-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 text-[15px] text-[#f5f5f5] hover:opacity-70 transition-opacity"
          >
            Cancelar
          </button>
          <h2 className="text-[16px] font-bold text-[#f5f5f5]">Respuesta</h2>
          <button
            type="button"
            className="absolute right-4 text-[#f5f5f5] hover:opacity-70 transition-opacity"
            aria-label="Más"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" height="24" width="24">
              <path d="M7 10.75C7.69036 10.75 8.25 11.3096 8.25 12C8.25 12.6904 7.69036 13.25 7 13.25C6.30964 13.25 5.75 12.6904 5.75 12C5.75 11.3096 6.30964 10.75 7 10.75Z" />
              <path d="M12 10.75C12.6904 10.75 13.25 11.3096 13.25 12C13.25 12.6904 12.6904 13.25 12 13.25C11.3096 13.25 10.75 12.6904 10.75 12C10.75 11.3096 11.3096 10.75 12 10.75Z" />
              <path d="M17 10.75C17.6904 10.75 18.25 11.3096 18.25 12C18.25 12.6904 17.6904 13.25 17 13.25C16.3096 13.25 15.75 12.6904 15.75 12C15.75 11.3096 16.3096 10.75 17 10.75Z" />
              <path
                clipRule="evenodd"
                d="M12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1ZM12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3Z"
                fillRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full px-6 pt-5 pb-4">
          <div className="w-full flex">
            {/* Left column for avatars and thread line */}
            <div className="flex flex-col items-center mr-3 relative">
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-[#222]">
                <img 
                  src={post.avatar_url || "/avatar_fallback.jpg"} 
                  alt={post.username || ""} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="w-[2px] bg-[#333] flex-1 my-2 min-h-[40px]"></div>
              
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-[#222] border-2 border-[#181818] z-10 -ml-0">
                <img 
                  src={user?.avatar_url || "/avatar_fallback.jpg"} 
                  alt={user?.username || ""} 
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>

            {/* Right column for content */}
            <div className="flex-1 min-w-0 pr-0">
              {/* Original Post */}
              <div className="mb-4">
                <div className="flex items-center gap-[6px] mb-0.5">
                  <span className="font-semibold text-[15px] text-[#f5f5f5] hover:underline cursor-pointer">
                    {post.username}
                  </span>
                  <span className="text-[15px] text-[#777]">{shortTimeAgo(post.created_at)}</span>
                </div>
                <div className="text-[15px] text-[#f5f5f5] leading-snug whitespace-pre-wrap break-words">
                  {post.caption}
                </div>
              </div>

              {/* Reply Area */}
              <div className="mt-8">
                <span className="font-semibold text-[15px] text-[#f5f5f5]">
                  {user?.username}
                </span>
                <textarea
                  ref={inputRef}
                  value={commentInput}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder={`Responde a ${post.username}...`}
                  className="w-full bg-transparent text-[#f5f5f5] text-[15px] leading-snug placeholder:text-[#555] outline-none resize-none mt-1 min-h-[30px]"
                  rows={1}
                />
                
                <div className="flex flex-wrap items-center gap-[10px] mt-2 text-[#777] mb-2">
                  <button type="button" className="hover:text-cyan-400 transition-colors">
                    <svg viewBox="0 0 24 24" fill="currentColor" height="20" width="20">
                      <path d="M7 5.5C7.82843 5.5 8.5 6.17157 8.5 7C8.5 7.82843 7.82843 8.5 7 8.5C6.17157 8.5 5.5 7.82843 5.5 7C5.5 6.17157 6.17157 5.5 7 5.5Z" />
                      <path clipRule="evenodd" d="M15.5879 1l2.709 1.0576C19.0255 1.1171 19.6657 1.2433 20.2578 1.5449C21.1986 2.0243 21.964 2.7897 22.4434 3.7305C22.745 4.3227 22.8711 4.9627 22.9307 5.6914V15.5996C22.9307 18.3086 21.1986 21.9757 15.5879 23H8.3887C2.778 21.9757 1.0459 18.3086 1.0459 15.5996V8.4004C1.0459 4.9627 2.778 2.0243 8.3887 1H15.5879zm2.7656 10C15.3973 11 12.8711 12.8367 11.8457 15.4355c-.2757.1569-.3714.0534-.6035-.1035C8.0736 14.5459 5.3196 14.546 2.9912 16.2637C3.1813 19.099 4.626 20.6729 8.3887 21h7.1992C19.3506 20.6729 20.7953 19.099 20.9883 15.5996V11.5156z" fillRule="evenodd" />
                    </svg>
                  </button>
                  <button type="button" className="hover:text-cyan-400 transition-colors">
                    <svg viewBox="0 0 24 24" fill="currentColor" height="20" width="20">
                      <path d="M21 8.4C21 5.8 20.6 4.6 19.5 3.4C18.7 3.1 18.1 3 15.6 3H8.4C5.8 3 4.6 3.1 3.4 4.6C3.1 4.9 3 5.8 3 8.4v7.2c0 2.6.1 3.5 1.6 4.6c1.2.3 2.5.4 3.8.4h7.2c2.6 0 3.5-.1 4.6-1.6c.3-1.2.4-2.5.4-3.8V8.4zM11.6 16v-8c0-.5.4-1 1-1h.9v3h-1.4v6zm3.2 0v-8c0-.4.3-1 .8-1h2.8v1.7h-1.5v6H14.8z" />
                    </svg>
                  </button>
                  <button type="button" className="hover:text-[#f5f5f5] transition-colors">
                    <svg viewBox="0 0 24 24" fill="currentColor" height="20" width="20">
                      <path d="M15 17c1.6 0 3 1.3 3 3s-1.3 3-3 3H4c-1.6 0-3-1.3-3-3s1.3-3 3-3h11zm0 2H4c-.5 0-1 .4-1 1s.4 1 1 1h11c.5 0 1-.4 1-1s-.4-1-1-1zm5-10c1.6 0 3 1.3 3 3s-1.3 3-3 3H4c-1.6 0-3-1.3-3-3s1.3-3 3-3h16zm0 2H4c-.5 0-1 .4-1 1s.4 1 1 1h16c.5 0 1-.4 1-1s-.4-1-1-1z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4">
          <span className="text-[#a8a8a8] text-[15px] opacity-0">C</span > 
          <button
            type="button"
            disabled={!commentInput.trim() || isSubmitting}
            onClick={() => {
              if (commentInput.trim() && !isSubmitting) {
                onSubmitComment();
                onClose();
              }
            }}
            className="rounded-full bg-cyan-400/10 text-cyan-400 px-[20px] py-[8px] font-semibold text-[15px] disabled:opacity-25 disabled:bg-transparent disabled:text-[#777] disabled:border disabled:border-white/10 transition-colors"
          >
            {isSubmitting ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
