import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bike,
  Check,
  ChevronDown,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { store } from './data/store.js';

gsap.registerPlugin(ScrollTrigger);

// three.js is heavy, so the 3D assembly section ships in its own chunk.
const AssemblyScroll = lazy(() => import('./components/AssemblyScroll.jsx'));

function readCart() {
  try {
    return JSON.parse(localStorage.getItem('diarra-cart') ?? '[]');
  } catch {
    return [];
  }
}

function formatPrice(price) {
  return price == null ? 'Prix sur demande' : `${new Intl.NumberFormat('fr-FR').format(price)} ${store.currency}`;
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [cloudinaryImages, setCloudinaryImages] = useState([]);
  const [category, setCategory] = useState('moto');
  const [brand, setBrand] = useState('Toutes les marques');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState(readCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const imagePreviewCloseRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const readJson = (url) => fetch(url)
      .then((response) => response.ok ? response.json() : [])
      .catch(() => []);

    Promise.all([readJson('/products.json'), readJson('/motos-cloudinary.json')])
      .then(([catalog, images]) => {
        setProducts(Array.isArray(catalog) ? catalog : []);
        setCloudinaryImages(Array.isArray(images) ? images : []);
      })
      .catch(() => {
        setProducts([]);
        setCloudinaryImages([]);
      });
  }, []);

  useEffect(() => {
    if (!products.length) return undefined;

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Motos et pièces détachées — ETS Diarra Frère',
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => {
        const image = imageFor(product);
        const item = {
          '@type': 'Product',
          name: product.name,
          brand: { '@type': 'Brand', name: product.brand },
          category: product.category === 'piece' ? 'Pièces détachées moto' : 'Moto',
          ...(image ? { image } : {}),
          ...(product.price != null ? {
            offers: {
              '@type': 'Offer',
              price: product.price,
              priceCurrency: store.currency
            }
          } : {})
        };
        return { '@type': 'ListItem', position: index + 1, item };
      })
    };
    const script = document.createElement('script');
    script.id = 'catalog-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.querySelector('#catalog-structured-data')?.remove();
    document.head.append(script);
    return () => script.remove();
  }, [cloudinaryImages, products]);

  useEffect(() => {
    localStorage.setItem('diarra-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!imagePreview) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement;
    document.body.style.overflow = 'hidden';
    imagePreviewCloseRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setImagePreview(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      if (previousActiveElement instanceof HTMLElement) previousActiveElement.focus();
    };
  }, [imagePreview]);

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo('.hero-copy > *', { y: 12 }, {
        y: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out'
      });
      gsap.fromTo('.hero-visual', { x: 20 }, {
        x: 0,
        duration: 0.85,
        ease: 'power3.out',
        delay: 0.1
      });
      const cards = gsap.utils.toArray('.product-card');
      const grid = document.querySelector('.product-grid');
      if (cards.length && grid) {
        gsap.fromTo(cards, { y: 12 }, {
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: { trigger: grid, start: 'top 86%' }
        });
      }
    });
    return () => context.revert();
  }, [category, products.length]);

  const brands = useMemo(() => [
    'Toutes les marques',
    ...new Set(products.filter((product) => product.category === category).map((product) => product.brand))
  ], [category, products]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = product.category === category;
    const matchesBrand = brand === 'Toutes les marques' || product.brand === brand;
    const matchesSearch = `${product.brand} ${product.name}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCategory && matchesBrand && matchesSearch;
  }), [brand, category, products, search]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartHasPrices = cart.length > 0 && cart.every((item) => item.price != null);
  const cartTotal = cart.reduce((total, item) => total + (item.price ?? 0) * item.quantity, 0);
  const featured = products.find((product) => product.id === 'lobane-rock-z-125') ?? products[0];
  const featuredImage = featured ? imageFor(featured) : '';

  function imageFor(product) {
    const match = cloudinaryImages.find((asset) => {
      const publicId = String(asset.public_id ?? '').toLowerCase();
      return (product.imageMatch ?? []).every((part) => publicId.includes(part));
    });
    return match?.url ?? product.imageUrl ?? '';
  }

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  }

  function addToCart(product) {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      return found
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: 1 }];
    });
    notify(`${product.name} ajouté au panier`);
  }

  function changeQuantity(id, amount) {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0));
  }

  function orderOnWhatsApp(items) {
    if (!store.whatsappNumber) {
      notify('Ajoute le numéro WhatsApp dans .env pour activer la commande.');
      return;
    }
    const lines = items.map((item) => {
      const catalogProduct = products.find((product) => product.id === item.id);
      const imageUrl = catalogProduct ? imageFor(catalogProduct) : item.imageUrl ?? '';
      const details = `${item.quantity} × ${item.name} — ${formatPrice(item.price)}`;
      return imageUrl ? `${details}\nPhoto : ${imageUrl}` : details;
    });
    const total = items.every((item) => item.price != null)
      ? `\nTotal indicatif : ${formatPrice(items.reduce((sum, item) => sum + item.price * item.quantity, 0))}`
      : '';
    const message = `Bonjour ${store.name}, je souhaite des informations sur :\n${lines.join('\n')}${total}`;
    window.open(
      `https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function selectCategory(value) {
    setCategory(value);
    setBrand('Toutes les marques');
  }

  return (
    <div className="site-shell min-h-screen">
      <div className="announcement-bar">
        <span>La sélection moto, en direct de la boutique</span>
        <span className="announcement-right"><span className="live-dot" /> Commande simple sur WhatsApp</span>
      </div>

      <header className="site-header">
        <a className="brand-lockup" href="#accueil" aria-label="ETS Diarra Frère, accueil">
          <span className="brand-mark"><Bike size={20} strokeWidth={1.8} /></span>
          <span className="brand-name">DIARRA<span>FRÈRE</span></span>
        </a>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navigation principale">
          <a href="#catalogue" onClick={() => setMenuOpen(false)}>Le catalogue</a>
          <a href="#montage" onClick={() => setMenuOpen(false)}>Le montage</a>
          <a href="#maison" onClick={() => setMenuOpen(false)}>La maison</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button menu-toggle" type="button" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button className="cart-trigger" type="button" onClick={() => setCartOpen(true)} aria-label={`Ouvrir le panier, ${cartCount} article(s)`}>
            <ShoppingBag size={18} /><span>Panier</span><span className="cart-count">{cartCount}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero-section" id="accueil">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> L’atelier de la mobilité</p>
            <h1>MOTOS<br /><span>&</span> PIÈCES<br /><em>DIARRA FRÈRE</em></h1>
            <p className="hero-description">Des motos choisies avec soin. Des pièces pour aller plus loin. Un échange direct, simplement.</p>
            <div className="hero-actions">
              <a className="button button-accent" href="#catalogue">Explorer le catalogue <ArrowUpRight size={17} /></a>
              <a className="text-link" href="#maison">Découvrir la maison <ArrowDown size={15} /></a>
            </div>
            <div className="hero-index"><span>01</span><span className="index-rule" /><span>La bonne route commence ici</span></div>
          </div>
          <div className="hero-visual">
            {featured && featuredImage
              ? <button className="hero-image-trigger" type="button" onClick={() => setImagePreview({ src: featuredImage, alt: featured.name })} aria-label={`Agrandir la photo de ${featured.name}`}><img className="hero-bike" src={featuredImage} alt="" fetchPriority="high" /></button>
              : <div className="hero-image-empty"><Bike size={68} strokeWidth={0.8} /><span>Visuels Cloudinary à connecter</span></div>}
            <div className="visual-stamp"><span>LA SÉLECTION</span><strong>DF / 01</strong></div>
            {featured && <div className="visual-caption"><span>{featured.brand}</span><strong>{featured.name}</strong><span>{formatPrice(featured.price)}</span></div>}
            <div className="visual-index">125<span>CC</span></div>
          </div>
          <div className="hero-side-note">MOBILITÉ / CONFIANCE / SERVICE</div>
        </section>

        <section className="service-strip" aria-label="Nos engagements">
          <div><span className="service-number">01</span><span><strong>Conseil direct</strong><small>Un échange humain, sans détour</small></span></div>
          <div><span className="service-number">02</span><span><strong>Commande WhatsApp</strong><small>Votre demande, en quelques mots</small></span></div>
          <div><span className="service-number">03</span><span><strong>Pièces & motos</strong><small>Un catalogue qui grandit avec vous</small></span></div>
        </section>

        <section className="catalog-section" id="catalogue">
          <div className="section-heading">
            <div><p className="eyebrow"><span className="eyebrow-line" /> La sélection du moment</p><h2>À chacun<br /><em>sa machine.</em></h2></div>
            <p className="section-intro">Découvrez nos motos 125 Apsonic et Lobane. Pour des pièces détachées moto ou une vérification de compatibilité, contactez la boutique ; disponibilité et tarifs sont confirmés avant commande.</p>
          </div>
          <div className="catalog-toolbar">
            <div className="category-tabs" role="tablist" aria-label="Type de produit">
              {[['moto', 'Motos'], ['piece', 'Pièces']].map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={category === id} className={category === id ? 'category-tab active' : 'category-tab'} onClick={() => selectCategory(id)}>
                  {label}<span>{id === 'moto' ? products.filter((product) => product.category === id).length : '—'}</span>
                </button>
              ))}
            </div>
            <div className="catalog-controls">
              <label className="search-field"><Search size={17} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un modèle" aria-label="Rechercher un modèle" /></label>
              <label className="brand-select-wrap"><SlidersHorizontal size={16} /><select value={brand} onChange={(event) => setBrand(event.target.value)} aria-label="Filtrer par marque">{brands.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label>
            </div>
          </div>
          {visibleProducts.length ? <div className="product-grid">
            {visibleProducts.map((product, index) => {
              const image = imageFor(product);
              return <article className="product-card" key={product.id}>
                <div className="product-media"><span className="product-index">0{index + 1} / 0{visibleProducts.length}</span><span className="product-tag">{product.label}</span>
                  {image ? <button className="image-preview-trigger" type="button" onClick={() => setImagePreview({ src: image, alt: product.name })} aria-label={`Agrandir la photo de ${product.name}`}><img src={image} alt="" loading="lazy" /></button> : <div className="product-image-empty"><Bike size={42} strokeWidth={.9} /><span>Visuel à venir</span></div>}
                  <button className="quick-add" type="button" onClick={() => addToCart(product)} aria-label={`Ajouter ${product.name} au panier`}><Plus size={18} /></button>
                </div>
                <div className="product-info"><div><span className="product-brand">{product.brand}</span><h3>{product.name}</h3></div><div className="product-meta"><span>{formatPrice(product.price)}</span><button type="button" onClick={() => orderOnWhatsApp([{ ...product, quantity: 1 }])} aria-label={`Demander des informations sur ${product.name}`}><ArrowUpRight size={18} /></button></div></div>
              </article>;
            })}
          </div> : <div className="empty-catalog"><span className="empty-icon"><Bike size={28} strokeWidth={1.2} /></span><p className="eyebrow">Catalogue en préparation</p><h3>{category === 'piece' ? 'Les pièces arrivent bientôt.' : 'Aucun modèle ne correspond.'}</h3><p>{category === 'piece' ? 'Écrivez-nous pour vérifier une pièce ou sa compatibilité.' : 'Essayez une autre recherche ou contactez la boutique.'}</p><button className="text-link" type="button" onClick={() => { setSearch(''); setBrand('Toutes les marques'); }}>Réinitialiser les filtres <ArrowRight size={15} /></button></div>}
          <div className="catalog-footnote"><span><Check size={14} /> Tarifs confirmés avec la boutique</span><span>Les visuels peuvent varier selon le modèle.</span></div>
        </section>

        <Suspense fallback={<section className="assembly-section" id="montage" aria-hidden="true" />}>
          <AssemblyScroll />
        </Suspense>

        <section className="manifesto-section" id="maison">
          <div className="manifesto-image"><div className="manifesto-image-inner"><div className="manifesto-image-placeholder"><Bike size={78} strokeWidth={.8} /><span>Une passion, une maison</span></div></div><span className="manifesto-image-label">SUR LE TERRAIN / AVEC VOUS</span></div>
          <div className="manifesto-copy"><p className="eyebrow"><span className="eyebrow-line" /> La maison Diarra</p><h2>Le bon conseil<br />fait partie<br /><em>du voyage.</em></h2><p>Choisir une moto ou une pièce, c’est d’abord trouver la bonne personne à qui poser ses questions. Ici, chaque demande commence par une conversation.</p><a className="button button-dark" href="#contact">Parlons de votre projet <ArrowUpRight size={17} /></a><span className="manifesto-signature">ETS DIARRA FRÈRE <span>—</span> MOTO & PIÈCES</span></div>
        </section>

        <section className="contact-section" id="contact"><div><p className="eyebrow"><span className="eyebrow-line" /> Restons en contact</p><h2>Votre prochaine<br /><em>étape commence ici.</em></h2></div><div className="contact-action"><p>Une question sur un modèle, une pièce ou une compatibilité ? Écrivez-nous et nous vous répondrons directement.</p><button className="button button-accent" type="button" onClick={() => orderOnWhatsApp([{ id: 'contact', name: 'Demande de conseil', price: null, quantity: 1 }])}>Écrire sur WhatsApp <MessageCircle size={17} /></button></div></section>
      </main>

      <footer className="site-footer"><a className="brand-lockup footer-brand" href="#accueil"><span className="brand-mark"><Bike size={20} /></span><span className="brand-name">DIARRA<span>FRÈRE</span></span></a><span className="footer-note">Motos & pièces détachées <span>© {new Date().getFullYear()}</span></span><a href="#accueil" className="back-top">Retour en haut <ArrowUpRight size={15} /></a></footer>
      <button className="mobile-whatsapp" type="button" onClick={() => orderOnWhatsApp([{ id: 'contact', name: 'Demande de conseil', price: null, quantity: 1 }])}><MessageCircle size={18} /> WhatsApp</button>

      {cartOpen && <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="drawer-heading"><div><p className="eyebrow">Votre sélection</p><h2 id="cart-title">Le panier <span>({cartCount})</span></h2></div><button className="icon-button" type="button" onClick={() => setCartOpen(false)} aria-label="Fermer le panier"><X size={21} /></button></div>
        {cart.length ? <><div className="cart-lines">{cart.map((item) => <div className="cart-line" key={item.id}><div><span className="product-brand">{item.brand ?? store.name}</span><h3>{item.name}</h3><span>{formatPrice(item.price)}</span></div><div className="quantity-control"><button type="button" onClick={() => changeQuantity(item.id, -1)} aria-label={`Retirer un ${item.name}`}><Minus size={14} /></button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`Ajouter un ${item.name}`}><Plus size={14} /></button></div></div>)}</div><div className="drawer-total"><span>{cartHasPrices ? 'Total indicatif' : 'Total à confirmer'}</span><strong>{cartHasPrices ? formatPrice(cartTotal) : 'Sur demande'}</strong></div><p className="drawer-note">Votre demande sera préparée dans WhatsApp. Elle ne part qu’après votre confirmation.</p><button className="button button-accent drawer-order" type="button" onClick={() => orderOnWhatsApp(cart)}>Continuer sur WhatsApp <ArrowUpRight size={17} /></button></> : <div className="cart-empty"><ShoppingBag size={35} strokeWidth={1.2} /><h3>Votre panier est vide.</h3><p>Ajoutez un modèle pour préparer votre demande.</p><button type="button" className="text-link" onClick={() => { setCartOpen(false); document.querySelector('#catalogue')?.scrollIntoView({ behavior: 'smooth' }); }}>Voir les motos <ArrowRight size={15} /></button></div>}
      </aside></div>}
      {imagePreview && <div className="image-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setImagePreview(null); }}><div className="image-preview-dialog" role="dialog" aria-modal="true" aria-label={`Photo agrandie : ${imagePreview.alt}`}><button ref={imagePreviewCloseRef} className="image-preview-close" type="button" onClick={() => setImagePreview(null)} aria-label="Fermer la photo"><X size={21} /></button><img src={imagePreview.src} alt={imagePreview.alt} /><p>{imagePreview.alt}</p></div></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
