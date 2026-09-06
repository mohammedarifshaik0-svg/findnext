import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f6fb] px-6">
      <section className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_30px_100px_rgba(21,32,64,.12)] sm:p-12">
        <div className="brand-mark mx-auto">FN</div>
        <h1 className="mt-8 text-3xl font-semibold tracking-[-.03em] text-slate-950">That sign-in link didn’t work.</h1>
        <p className="mt-4 leading-7 text-slate-600">It may have expired or already been used. Return to FindNext and request a fresh link or continue with Google.</p>
        <Link href="/" className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-indigo-600 px-6 text-sm font-semibold text-white hover:bg-indigo-700">Return to FindNext</Link>
      </section>
    </main>
  );
}
