export default function ChoLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
      {/* Filter bar skeleton */}
      <div className="flex gap-3 mb-6 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-200 h-9 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-200 h-44" />
            <div className="p-3 space-y-2">
              <div className="bg-gray-200 h-4 rounded w-3/4" />
              <div className="bg-gray-200 h-3 rounded w-1/2" />
              <div className="bg-gray-200 h-5 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
