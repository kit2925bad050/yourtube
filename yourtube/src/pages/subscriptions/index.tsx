import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlaySquare } from "lucide-react";

export default function SubscriptionsPage() {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-2xl mx-auto text-center py-16">
        <PlaySquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Subscriptions</h1>
        <p className="text-gray-600 mb-6">
          Subscribe to channels to see their latest videos here.
        </p>
        <Link href="/explore">
          <Button>Explore channels</Button>
        </Link>
      </div>
    </main>
  );
}
