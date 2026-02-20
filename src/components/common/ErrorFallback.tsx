interface ErrorFallbackProps {
  error: any;
  resetErrorBoundary: () => void;
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="text-4xl">⚠️</div>
      <h3 className="text-xl font-bold text-white">Something went wrong</h3>
      <p className="text-slate-400 text-sm">{error.message}</p>
      <button onClick={resetErrorBoundary} className="px-4 py-2 bg-blue-600 rounded-lg text-white font-bold text-sm">
        Try Again
      </button>
    </div>
  );
}
