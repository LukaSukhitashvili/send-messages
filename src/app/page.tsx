import MessageForm from '@/components/MessageForm'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex flex-col items-center py-12 px-4 sm:py-20">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Cloud Mailbox
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Send messages and images directly to the administrator's local database
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-100 dark:border-gray-700">
          <MessageForm />
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>All submissions are securely stored and synced locally.</p>
        </div>
      </div>
    </div>
  )
}