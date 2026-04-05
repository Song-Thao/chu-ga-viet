export default function ThuVienLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-pulse space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-4 flex gap-4">
          <div className="bg-gray-200 rounded-full w-10 h-10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="bg-gray-200 h-4 rounded w-1/4" />
            <div className="bg-gray-200 h-4 rounded w-full" />
            <div className="bg-gray-200 h-4 rounded w-3/4" />
            <div className="bg-gray-200 h-40 rounded-lg mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
