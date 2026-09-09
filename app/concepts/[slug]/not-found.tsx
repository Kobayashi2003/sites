import Link from 'next/link';

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-[#11130f] p-8 text-[#f2f0e9]"><div className="max-w-md text-center"><p className="font-mono text-xs uppercase tracking-widest opacity-60">404 / Missing study</p><h1 className="mt-4 text-5xl font-semibold tracking-tight">This concept is off the wall.</h1><Link className="mt-8 inline-block border-b border-current pb-1" href="/">Return to the archive</Link></div></main>;
}
