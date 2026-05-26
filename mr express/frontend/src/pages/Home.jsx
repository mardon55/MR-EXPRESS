import { useEffect, useState } from 'react';

import { api } from '../api';

import { useApp } from '../context/AppContext';

import { useTelegram } from '../hooks/useTelegram';

import SearchBar from '../components/SearchBar';

import StoriesBar from '../components/StoriesBar';

import BannerCarousel from '../components/BannerCarousel';

import ProductCard from '../components/ProductCard';

import ProductGrid from '../components/ProductGrid';



export default function Home() {

  const [search, setSearch] = useState('');

  const [banners, setBanners] = useState([]);

  const [discounts, setDiscounts] = useState([]);

  const [featured, setFeatured] = useState([]);

  const [searchResults, setSearchResults] = useState(null);

  const [imageAnalyzing, setImageAnalyzing] = useState(false);

  const { refreshCart } = useApp();

  const { haptic } = useTelegram();



  useEffect(() => {

    api.banners().then(setBanners).catch(console.error);

    api.products({ discount_only: true, limit: 6 }).then(setDiscounts).catch(console.error);

    api.products({ featured_only: true, limit: 4 }).then(setFeatured).catch(console.error);

  }, []);



  useEffect(() => {

    if (!search.trim()) {

      setSearchResults(null);

      return;

    }

    const t = setTimeout(() => {

      api.products({ q: search.trim() }).then(setSearchResults).catch(() => setSearchResults([]));

    }, 400);

    return () => clearTimeout(t);

  }, [search]);



  const handleAddCart = async (product) => {

    const cart = await api.cart().catch(() => ({ items: [] }));

    const existing = cart.items?.find((i) => i.product.id === product.id);

    const qty = (existing?.quantity || 0) + 1;

    await api.updateCart(product.id, qty);

    await refreshCart();

    haptic('success');

  };



  /** Rasm yuklangach AI qidiruv (hozircha demo tahlil + mahsulotlar ro'yxati) */
  const handleImageSearch = async (file) => {
    if (!file?.type?.startsWith('image/')) return;

    setImageAnalyzing(true);
    haptic('light');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1600));
      const results = await api.products({ limit: 12 }).catch(() => []);
      setSearch('');
      setSearchResults(results);
      haptic('success');
    } catch {
      setSearchResults([]);
      haptic('error');
    } finally {
      setImageAnalyzing(false);
    }
  };



  return (

    <div className="scroll-area h-full px-4 pb-nav-safe pt-1">

      <StoriesBar />

      <SearchBar
        value={search}
        onChange={setSearch}
        onImageSelect={handleImageSearch}
        imageAnalyzing={imageAnalyzing}
      />



      {searchResults !== null ? (

        <section className="mt-6">

          <h2 className="mb-3.5 text-lg font-bold tracking-tight text-theme">

            Qidiruv natijalari

          </h2>

          <ProductGrid products={searchResults} onAddCart={handleAddCart} />

        </section>

      ) : (

        <>

          <section className="mt-5">

            <BannerCarousel banners={banners} />

          </section>



          <section className="mt-7">

            <div className="mb-3.5 flex items-center justify-between">

              <h2 className="text-lg font-bold tracking-tight text-theme">Chegirmalar</h2>

              <span className="glass-subtle rounded-full px-3 py-1 text-xs font-semibold text-ios-red">

                50% gacha

              </span>

            </div>

            <div className="-mx-1 flex gap-3.5 overflow-x-auto hide-scrollbar px-1 pb-1">

              {discounts.map((p) => (

                <div key={p.id} className="w-[168px] shrink-0">

                  <ProductCard product={p} onAddCart={handleAddCart} />

                </div>

              ))}

            </div>

          </section>



          <section className="mt-7">

            <h2 className="mb-3.5 text-lg font-bold tracking-tight text-theme">

              Tavsiya etilgan

            </h2>

            <ProductGrid products={featured} onAddCart={handleAddCart} />

          </section>

        </>

      )}

    </div>

  );

}

