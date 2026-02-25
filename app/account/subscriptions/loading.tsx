export default function SubscriptionsLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
