import { CopyButton } from "@/components/CopyButton";

/** Code well (#well token): one C or Python snippet per tool, with copy button. */
export function CodeSnippet({ language, code }: { language: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-card border border-line-soft bg-well">
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-2">
        <span className="font-mono text-xs text-mute">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-body">
        <code>{code}</code>
      </pre>
    </div>
  );
}
