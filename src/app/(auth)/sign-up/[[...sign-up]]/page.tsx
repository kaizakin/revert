import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Join · Revert" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-4">
      <SignUp />
      <p className="text-center text-[11px] leading-relaxed text-faint">
        No phone number required. Your username is how people find you here.
      </p>
    </div>
  );
}
