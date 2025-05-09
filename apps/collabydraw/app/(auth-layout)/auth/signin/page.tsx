import { SignInForm } from "@/components/auth/signin-form";
import ScreenLoading from "@/components/ScreenLoading";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Suspense } from "react";

export default function SignInPage() {
    return (
        <Card className="border-0 shadow-none lg:shadow-2xl rounded-3xl m-0 mx-auto px-6 py-8 lg:p-16 relative z-10 max-w-[480px] bg-yellow-light">
            <CardHeader className="p-0">
                <CardTitle className="text-2xl font-bold text-center">Hi there!</CardTitle>
                <CardDescription className="text-sm pb-4 text-primary text-center">Enter your email to sign in to your account</CardDescription>
            </CardHeader>
            <CardContent className="p-0 !my-0">
                <Suspense fallback={<ScreenLoading />}>
                    <SignInForm />
                </Suspense>
            </CardContent>
            <CardFooter className="px-0 pt-2 pb-0 flex-col !mt-0 gap-2">
                <div className="relative flex h-7 items-center justify-center gap-2">
                    <div className="w-6 border-t border-yellow-darker"></div>
                    <span className="flex-shrink font-primary text-sm text-yellow-darker">or</span>
                    <div className="w-6 border-t border-yellow-darker"></div>
                </div>
                <div className="flex w-full flex-col items-center gap-3">
                    <Link className="text-color-primary text-sm hover:underline hover:underline-offset-4 transition-all duration-200 ease-in-out" href="/auth/signup">Don&apos;t have an account? Sign Up</Link>
                </div>
                <div className="flex w-full flex-col items-center gap-3">
                    <Link className="text-color-primary text-sm hover:underline hover:underline-offset-4 transition-all duration-200 ease-in-out" href="/">Back to Home</Link>
                </div>
            </CardFooter>
        </Card>
    );
}