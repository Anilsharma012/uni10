import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Types for orders and items
type OrderItem = { id: string; title: string; price: number; qty: number; image?: string };
export type Order = {
  _id: string;
  total: number;
  payment?: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | string;
  createdAt: string;
  items: OrderItem[];
};

type OrdersResponse = { ok: boolean; data?: Order[] };

const LS_ORDERS = "uni_orders_v1";
const LS_CART = "uni_cart_v1";
const LS_LAST = "uni_last_order_id";

const statuses = ["All", "Pending", "Paid", "Shipped", "Delivered", "Cancelled"] as const;

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    n || 0,
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { items: cartItems, addToCart, count } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [filter, setFilter] = useState<(typeof statuses)[number]>("All");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showCount, setShowCount] = useState(10);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Protect route
  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  // Load orders with progressive enhancement
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoadingOrders(true);
      let list: Order[] = [];
      try {
        const res = (await api("/api/orders?mine=1")) as { ok: boolean; json: OrdersResponse } & any;
        if (res.ok && res.json?.ok && Array.isArray(res.json.data)) {
          list = res.json.data as Order[];
        }
      } catch {}
      if (!list.length) {
        try {
          const raw = localStorage.getItem(LS_ORDERS);
          list = raw ? (JSON.parse(raw) as Order[]) : [];
        } catch {
          list = [];
        }
      }
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (!cancelled) setOrders(list);
      if (!cancelled) setLoadingOrders(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Highlight last placed order once
  useEffect(() => {
    const fromState = location?.state?.lastOrderId as string | undefined;
    const fromLS = localStorage.getItem(LS_LAST) || undefined;
    const id = fromState || fromLS || null;
    if (id) {
      setHighlightId(id);
      localStorage.removeItem(LS_LAST);
      const t = setTimeout(() => setHighlightId(null), 4000);
      return () => clearTimeout(t);
    }
  }, [location?.state]);

  // Compute filtered and paginated orders
  const filtered = useMemo(() => {
    if (filter === "All") return orders;
    const f = filter.toLowerCase();
    return orders.filter((o) => (o.status || "").toLowerCase() === f);
  }, [orders, filter]);
  const visible = filtered.slice(0, showCount);

  // Cart snapshot (up to 5 items), with localStorage fallback
  const cartSnapshot: OrderItem[] = useMemo(() => {
    if (cartItems && cartItems.length) return cartItems.slice(0, 5).map((i) => ({ id: i.id, title: i.title, price: i.price, qty: i.qty, image: i.image }));
    try {
      const raw = localStorage.getItem(LS_CART) || localStorage.getItem("cart_v1");
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      return (arr as OrderItem[]).slice(0, 5);
    } catch {
      return [];
    }
  }, [cartItems]);
  const cartSubtotal = useMemo(() => cartSnapshot.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 0), 0), [cartSnapshot]);

  const toggleExpand = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const reorder = (order: Order) => {
    order.items.forEach((it) => addToCart({ id: it.id, title: it.title, price: it.price, image: it.image }));
    toast({ title: "Added to cart", description: `Reordered ${order.items.length} item(s)` });
  };

  const statusBadge = (s: string) => {
    const base = "px-2 py-0.5 rounded text-xs font-medium capitalize";
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      paid: "bg-green-100 text-green-800 border border-green-200",
      shipped: "bg-blue-100 text-blue-800 border border-blue-200",
      delivered: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      cancelled: "bg-red-100 text-red-800 border border-red-200",
    };
    return <span className={`${base} ${map[(s || "").toLowerCase()] || "bg-muted text-foreground/80"}`}>{s}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter">Welcome{user?.name ? `, ${user.name}` : ""}</h1>
            <p className="text-muted-foreground text-sm">Here is your recent activity</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/cart" className="relative inline-flex items-center">
              <span className="text-sm mr-2">Cart Items:</span>
              <span className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-bold">{count}</span>
            </Link>
            <Button variant="outline" onClick={async () => { await (async () => { try { const { signOut } = useAuth(); /* unreachable - replaced below */ } catch {} })(); }}>
              Logout
            </Button>
          </div>
        </div>

        {/* Recent Orders */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Orders</h2>
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as any);
                  setShowCount(10);
                }}
                className="border border-border rounded px-2 py-1 text-sm bg-background"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingOrders ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse border border-border rounded p-4">
                  <div className="h-4 bg-muted/40 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted/30 rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded">
              <p className="text-muted-foreground mb-4">You have no orders yet.</p>
              <Link to="/">
                <Button>Shop Now</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map((o) => (
                <Card
                  key={o._id}
                  className={`p-4 ${highlightId === o._id ? "ring-2 ring-primary" : ""}`}
                >
                  <button className="w-full text-left" onClick={() => toggleExpand(o._id)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">Order #{(o._id || "").slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(Number(o.total || 0))}</div>
                        <div className="mt-1 inline-flex items-center gap-2">
                          {statusBadge(o.status)}
                          <span className="text-xs text-muted-foreground">{o.items?.reduce((s, i) => s + (i.qty || 0), 0)} item(s)</span>
                        </div>
                      </div>
                    </div>
                    {/* thumbnails */}
                    {o.items?.length ? (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {o.items.slice(0, 6).map((it, idx) => (
                          <img
                            key={idx}
                            src={it.image || "/placeholder.svg"}
                            alt={it.title}
                            className="w-10 h-10 object-cover rounded border"
                          />
                        ))}
                      </div>
                    ) : null}
                  </button>

                  {expanded[o._id] && (
                    <div className="mt-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground border-b">
                              <th className="py-2">Item</th>
                              <th className="py-2">Qty</th>
                              <th className="py-2">Price</th>
                              <th className="py-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {o.items.map((it, idx) => (
                              <tr key={idx} className="border-b last:border-b-0">
                                <td className="py-2">
                                  <div className="flex items-center gap-3">
                                    <img src={it.image || "/placeholder.svg"} alt={it.title} className="w-10 h-10 object-cover rounded border" />
                                    <span className="font-medium">{it.title}</span>
                                  </div>
                                </td>
                                <td className="py-2">{it.qty}</td>
                                <td className="py-2">{formatCurrency(it.price)}</td>
                                <td className="py-2">{formatCurrency(it.price * it.qty)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Payment: {o.payment || "-"}</div>
                        <Button size="sm" onClick={() => reorder(o)}>Reorder</Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              {filtered.length > showCount && (
                <div className="text-center pt-2">
                  <Button variant="outline" onClick={() => setShowCount((c) => c + 10)}>Load more</Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Cart Snapshot */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Cart Snapshot</h2>
            <Link to="/cart" className="text-sm text-primary hover:underline">View Full Cart</Link>
          </div>
          {cartSnapshot.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Your cart is empty. <Link to="/shop" className="text-primary hover:underline">Browse products</Link>
            </div>
          ) : (
            <Card className="p-4">
              <div className="divide-y">
                {cartSnapshot.map((it) => (
                  <div key={it.id + String(it.image)} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={it.image || "/placeholder.svg"} alt={it.title} className="w-10 h-10 object-cover rounded border" />
                      <div>
                        <div className="font-medium text-sm">{it.title}</div>
                        <div className="text-xs text-muted-foreground">Qty: {it.qty}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium">{formatCurrency(it.price)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="font-bold">{formatCurrency(cartSubtotal)}</div>
              </div>
            </Card>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
