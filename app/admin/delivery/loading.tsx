export default function DeliveryAdminLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="bg-gray-50 px-4 py-3">
          <div className="flex gap-4">
            {[120, 80, 100, 80, 60].map((w, i) => (
              <div key={i} className={`h-4 animate-pulse rounded bg-gray-200`} style={{ width: w }} />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 border-t border-gray-100 px-4 py-3">
            {[120, 80, 100, 80, 60].map((w, j) => (
              <div key={j} className="h-4 animate-pulse rounded bg-gray-100" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
