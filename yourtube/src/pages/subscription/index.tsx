import { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Script from "next/script";
import { Check } from "lucide-react";

const PLANS = [
  { id: "FREE", price: 0, limit: "5 min/day", features: ["Basic streaming", "1 download/day"] },
  { id: "BRONZE", price: 10, limit: "7 min/day", features: ["Extended watch", "Unlimited downloads"] },
  { id: "SILVER", price: 50, limit: "10 min/day", features: ["More watch time", "Unlimited downloads"] },
  { id: "GOLD", price: 100, limit: "Unlimited", features: ["Unlimited watch", "Unlimited downloads"] },
];

export default function SubscriptionPage() {
  const { user } = useUser();
  const [currentPlan, setCurrentPlan] = useState("FREE");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?._id) {
      axiosInstance.get(`/payment/subscription/${user._id}`).then((res) => {
        setCurrentPlan(res.data.plan || "FREE");
      });
    }
  }, [user?._id]);

  const handleUpgrade = async (plan: string) => {
    if (!user?._id || plan === "FREE") return;
    setLoading(true);
    try {
      const orderRes = await axiosInstance.post("/payment/create-order", { userId: user._id, plan });
      const { orderId, amount, keyId } = orderRes.data;

      if (!orderId || !keyId) {
        toast.error(orderRes.data?.message || "Payment initialization failed");
        return;
      }

      const options = {
        key: keyId,
        amount,
        currency: "INR",
        name: "YourTube",
        description: `${plan} Subscription`,
        order_id: orderId,
        handler: async (response: any) => {
          const verifyRes = await axiosInstance.post("/payment/verify", {
            userId: user._id,
            plan,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          setCurrentPlan(plan);
          toast.success(verifyRes.data.message);
        },
        theme: { color: "#DC2626" },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      rzp.on && rzp.on("payment.failed", function (resp: any) {
        toast.error("Payment failed or was cancelled");
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <main className="flex-1 p-6 text-center">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <p className="text-muted-foreground mt-2">Sign in to manage your subscription</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <h1 className="text-2xl font-bold mb-2">Subscription Plans</h1>
      <p className="text-muted-foreground mb-8">Current plan: <strong>{currentPlan}</strong></p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`border rounded-xl p-6 ${currentPlan === plan.id ? "border-red-500 ring-2 ring-red-200" : ""}`}
          >
            <h2 className="text-lg font-bold">{plan.id}</h2>
            <p className="text-3xl font-bold my-2">
              {plan.price === 0 ? "Free" : `₹${plan.price}`}
            </p>
            <p className="text-sm text-muted-foreground mb-4">Watch: {plan.limit}</p>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> {f}
                </li>
              ))}
            </ul>
            {currentPlan === plan.id ? (
              <Button disabled className="w-full">Current Plan</Button>
            ) : plan.id === "FREE" ? (
              <Button disabled variant="outline" className="w-full">Default</Button>
            ) : (
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading}
              >
                Upgrade
              </Button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
