export default function CongDongLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-pulse space-y-4">
      {/* Create post bar skeleton */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3 items-center">
        <div className="bg-gray-200 rounded-full w-10 h-10 flex-shrink-0" />
        <div className="bg-gray-200 h-10 rounded-full flex-1" />
      </div>
      {/* Post cards skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex gap-3 items-center">
            <div className="bg-gray-200 rounded-full w-10 h-10 flex-shrink-0" />
            <div className="space-y-1 flex-1">
              <div className="bg-gray-200 h-3 rounded w-1/3" />
              <div className="bg-gray-200 h-3 rounded w-1/4" />
            </div>
          </div>
          <div className="bg-gray-200 h-4 rounded w-full" />
          <div className="bg-gray-200 h-4 rounded w-4/5" />
          <div className="bg-gray-200 h-52 rounded-lg" />
          <div className="flex gap-4">
            <div className="bg-gray-200 h-8 rounded w-16" />
            <div className="bg-gray-200 h-8 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
