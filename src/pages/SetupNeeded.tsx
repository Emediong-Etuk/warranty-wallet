import { Logo } from '../components/Layout'

export default function SetupNeeded() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Logo />
      <div className="card mt-8 p-8">
        <h1 className="text-xl font-bold">Connect Appwrite to get started</h1>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>
            Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to{' '}
            <code className="rounded bg-slate-100 px-1">.env</code>
          </li>
          <li>Fill in your Appwrite endpoint, project ID and API key</li>
          <li>
            Run <code className="rounded bg-slate-100 px-1">npm run setup</code> to create the database, table and bucket
          </li>
          <li>
            Restart <code className="rounded bg-slate-100 px-1">npm run dev</code>
          </li>
        </ol>
        <p className="mt-6 text-sm text-slate-500">Full instructions are in the README.</p>
      </div>
    </div>
  )
}
