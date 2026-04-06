import Link from 'next/link';

interface AdminHelpLinkProps {
  section: string;
}

export function AdminHelpLink({ section }: AdminHelpLinkProps) {
  return (
    <Link
      href={`/admin/docs?section=${section}`}
      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[var(--color-brand-orange)] transition-colors"
      title="Помощ"
    >
      <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">?</span>
    </Link>
  );
}
