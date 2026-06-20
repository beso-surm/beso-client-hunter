export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-200" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}
