export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
      {/* Banner skeleton */}
      <div className="w-full h-48 bg-gray-200 rounded-2xl mb-6" />
      {/* Cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-200 h-40" />
            <div className="p-3 space-y-2">
              <div className="bg-gray-200 h-4 rounded w-3/4" />
              <div className="bg-gray-200 h-3 rounded w-1/2" />
              <div className="bg-gray-200 h-4 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
