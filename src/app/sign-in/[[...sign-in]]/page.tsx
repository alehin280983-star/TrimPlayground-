import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-background">
            <SignIn routing="path" path="/sign-in" />
        </div>
    );
}
