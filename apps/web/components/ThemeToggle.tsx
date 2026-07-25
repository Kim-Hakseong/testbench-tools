"use client";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // storage unavailable (private mode) — theme still applies for this page
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark / light theme"
      className="group flex h-8 w-8 items-center justify-center rounded-btn border border-line-strong text-body transition-colors hover:border-mute"
    >
      {/* Both icons rendered; tokens.css theme attribute decides visibility (no hydration mismatch). */}
      <svg className="tb-icon-sun h-4 w-4 transition-transform duration-300 group-hover:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
      </svg>
      <svg className="tb-icon-moon h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    </button>
  );
}
