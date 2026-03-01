export default function OrdersLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      {/* Filter bar skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="h-10 w-full sm:w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-gray-200" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-10 w-20 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
      {/* Tab bar skeleton */}
      <div className="flex gap-3 mb-4 border-b pb-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-gray-200" />
        ))}
      </div>
      {/* Order card skeletons */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
