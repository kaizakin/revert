import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Join · Revert" };

export default function SignUpPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
        Revert
      </Link>

      <div className="w-full max-w-sm">
        <SignUp />
      </div>

      <p className="max-w-sm text-center text-[11px] leading-relaxed text-faint">
        No phone number required. Your username is how people find you here.
      </p>
    </main>
  );
}
