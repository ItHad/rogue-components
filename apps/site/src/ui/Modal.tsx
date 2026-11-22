import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 横に広く出す */
  wide?: boolean;
}

/** 関門を出すための、ふつうのモーダル。重ねて開いてもよい (body 直下に出し、Escape はいちばん上のものだけ閉じる)。 */
export function Modal({ title, onClose, children, wide = false }: ModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 開いたときだけフォーカスを移し、Escape で閉じられるようにする
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const backdrops = document.querySelectorAll(".modal-backdrop");
      if (backdrops[backdrops.length - 1] === backdropRef.current) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return createPortal(
    <div
      ref={backdropRef}
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        className={wide ? "modal modal--wide" : "modal"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="modal__header">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          <button type="button" className="modal__close" aria-label={t.modalClose} onClick={onClose}>
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
