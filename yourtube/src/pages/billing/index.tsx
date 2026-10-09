import { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { formatDistanceToNow } from "date-fns";

export default function BillingPage() {
  const { user } = useUser();
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (user?._id) {
      axiosInstance.get(`/payment/invoices/${user._id}`).then((res) => {
        setInvoices(Array.isArray(res.data) ? res.data : []);
      });
    }
  }, [user?._id]);

  if (!user) {
    return (
      <main className="flex-1 p-6 text-center">
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-2">Sign in to view invoices</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Billing & Invoices</h1>
      {invoices.length === 0 ? (
        <p className="text-muted-foreground">No invoices yet. Upgrade a plan to see invoices here.</p>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv._id} className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{inv.plan} Plan</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(inv.createdAt))} ago • {inv.status}
                </p>
              </div>
              <p className="font-bold">₹{inv.amount}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
