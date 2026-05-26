import ProductCard from './ProductCard';

export default function ProductGrid({ products, onAddCart, emptyMessage }) {
  if (!products?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="glass rounded-squircle-lg px-8 py-6 text-center shadow-glass">
          <p className="text-sm font-medium text-ios-muted">{emptyMessage || 'Mahsulot topilmadi'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3.5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onAddCart={onAddCart} />
      ))}
    </div>
  );
}
