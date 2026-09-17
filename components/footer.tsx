import Link from "next/link";

interface FooterProps {
  showCredits?: boolean;
}

export function Footer({ showCredits = false }: FooterProps) {
  return (
    <footer
      className="w-full py-8 mt-auto text-center relative z-10"
      style={{
        background: "#000",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {showCredits && (
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p
            className="text-xs sm:text-sm"
            style={{ color: "rgba(245,245,240,0.55)" }}
          >
            Special shoutout to{" "}
            <a
              href="https://github.com/subhraneel2005"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#c9a96e",
                fontWeight: 600,
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Subhraneel Goswami
            </a>{" "}
            &mdash; built on top of his original open-source project foundation.
          </p>
          <p className="text-xs" style={{ color: "rgba(245,245,240,0.25)" }}>
            Enhanced with Humanizer anti-AI writing, live LaTeX &amp; in-place editing, and native Word (.docx) support.
          </p>
        </div>
      )}
    </footer>
  );
}
