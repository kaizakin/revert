import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in · Revert" };

export default function SignInPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
        Revert
      </Link>

      <div className="w-full max-w-sm">
        <SignIn />
      </div>
    </main>
  );
}
