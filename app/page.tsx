import { AuthButton } from "@/components/auth-button";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
            </div>
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </nav>
        <div className="registration-root">
              <div className="registration-card intro-card">
                <h1 className="registration-title">Project Intro</h1>

                <p className="intro-text">
                  This project is a 3D car configuration experience built around interactive vehicle and engine visualization.
                  You can start on the Home page, open Customize to pick your car model and adjust options, then move to the
                  Engine flow to explore Diesel/Gasoline and Hybrid setups.
                </p>

                <p className="intro-text">
                  In Diesel/Gasoline and Hybrid pages, you can inspect the loaded models in 3D, change materials, run calculations,
                  and review chart outputs like RPM, power, speed, temperature, and durability over time. The project is designed so
                  users can compare configurations quickly and understand performance differences visually.
                </p>

                <p className="intro-text">
                  You can also store your chosen builds in the Garage page and revisit saved models later. The current version focuses
                  on frontend interaction and visualization, and backend connection can be added afterward.
                </p>

                <Suspense fallback={null}>
                  <ContinueButton />
                </Suspense>

              </div>
            </div>

        <footer className="flex items-center justify-center mx-auto text-center text-xs gap-8 py-16">
          <p>
            copyrights
          </p>
        </footer>
      </div>
    </main>
  );
}

async function ContinueButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    return null;
  }

  return (
    <div className="mt-8 flex justify-center">
      <Button asChild size="lg">
        <Link href="/pages/homepage">Continue</Link>
      </Button>
    </div>
  );
}
