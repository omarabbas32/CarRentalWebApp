import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create an account · CarRental",
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <RegisterForm />
    </Suspense>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
