import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
// ❌ removed: import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

/* ========= Backend base & tiny helper ========= */
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? `${window.location.origin}` : '');

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* ignore non-json */ }
  if (!res.ok) {
    const msg = json?.message || json?.error || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return (json as T);
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const categories = ['All', 'T-Shirts', 'Hoodies', 'Jackets', 'Bottoms', 'Accessories'];

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProducts = async () => {
    try {
      // GET /api/products -> Product[]
      const data = await apiFetch<Product[]>('/api/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (productId: string) => {
    if (!user) {
      toast.error('Please sign in to add to wishlist');
      return;
    }
    try {
      // POST /api/wishlist { userId, productId }
      const userId = String((user as any).id || (user as any)._id || '');
      await apiFetch('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({ userId, productId }),
      });
      toast.success('Added to wishlist');
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists')) {
        toast.error('Already in wishlist');
      } else {
        toast.error(e?.message || 'Failed to add to wishlist');
      }
    }
  };

  const filteredProducts =
    selectedCategory === 'All'
      ? products
      : products.filter((p) => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
            All <span className="text-primary">Products</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading products...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id as any}
                className="group overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300"
              >
                <div className="aspect-square overflow-hidden bg-secondary relative">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <button
                    onClick={() => addToWishlist(String(product.id))}
                    className="absolute top-2 right-2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
                  >
                    <Heart className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {product.category}
                  </p>
                  <h3 className="font-semibold mb-2">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold">
                      ₹{Number(product.price || 0).toLocaleString('en-IN')}
                    </p>
                    <Button size="icon" variant="secondary">
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Stock: {product.stock}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Products;
