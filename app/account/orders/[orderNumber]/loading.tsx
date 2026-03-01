export default function OrderDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back link skeleton */}
      <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />

      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="h-8 w-56 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-28 animate-pulse rounded-full bg-gray-200" />
      </div>

      {/* Order info card skeleton */}
      <div className="bg-white rounded-xl border p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
              <div className="h-5 w-36 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Address card skeleton */}
      <div className="bg-white rounded-xl border p-6">
        <div className="h-6 w-44 animate-pulse rounded bg-gray-200 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-48 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="bg-white rounded-xl border p-6">
        <div className="h-6 w-52 animate-pulse rounded bg-gray-200 mb-6" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-6 h-6 animate-pulse rounded-full bg-gray-200" />
              <div className="space-y-1 flex-1">
                <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-44 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
