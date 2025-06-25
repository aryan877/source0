import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          {/* Icon */}
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg">
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="h-10 w-10 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900">Chat Not Found</h1>

          {/* Description */}
          <p className="mb-8 text-lg leading-relaxed text-slate-600">
            The shared conversation you&apos;re looking for doesn&apos;t exist or is no longer
            available.
          </p>

          {/* Action Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Start New Chat
          </Link>

          {/* Additional Help */}
          <div className="mt-8 text-sm text-slate-500">
            <p>Need help? Contact support or try creating a new conversation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
