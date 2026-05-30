// frontend/src/features/today/AddMealSheet.jsx
import React, { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet';
import Field from '../../components/Field';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { addMeal, searchProducts } from '../../api/meals';
import { getUserId } from '../../auth/storage';
import AddProductSheet from './AddProductSheet';
import styles from './AddMealSheet.module.css';

/**
 * Two-step bottom sheet:
 *   step 'search'  → user types, sees live results
 *   step 'grams'   → user enters grams + Add
 *
 * If no results: "Create new product" link opens the AddProductSheet
 * stacked on top. After creation, jumps to step 'grams' with the new product.
 */
export default function AddMealSheet({ isOpen, onClose, onAdded }) {
  const [step, setStep] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState('');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [productSheetOpen, setProductSheetOpen] = useState(false);

  // Reset state every time we open
  useEffect(() => {
    if (isOpen) {
      setStep('search'); setQuery(''); setResults([]); setSelected(null);
      setGrams(''); setServerError(''); setSubmitting(false);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (step !== 'search') return undefined;
    if (!query || query.trim().length < 1) { setResults([]); return undefined; }
    const handle = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const r = await searchProducts(query.trim());
        setResults(r);
      } catch (err) {
        // Silent on search errors — user retries by typing again
        console.error('Search failed:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, step]);

  const pick = (product) => {
    setSelected(product);
    setStep('grams');
    setGrams('');
  };

  const handleAdd = async () => {
    const n = parseFloat(grams);
    if (Number.isNaN(n) || n <= 0) return;
    setSubmitting(true);
    setServerError('');
    try {
      await addMeal(getUserId(), selected.productId, Math.round(n));
      onAdded();
    } catch (err) {
      setServerError(err.message || 'Could not add meal');
    } finally {
      setSubmitting(false);
    }
  };

  const title = step === 'search' ? 'Add a meal' : `How much ${selected?.name}?`;

  const footer = step === 'grams'
    ? (
        <Button block disabled={!grams || submitting} onClick={handleAdd}>
          {submitting ? 'Adding…' : 'Add meal'}
        </Button>
      )
    : null;

  return (
    <>
      <Sheet isOpen={isOpen && !productSheetOpen} onClose={onClose} title={title} footer={footer}>
        <ErrorBanner message={serverError} onDismiss={() => setServerError('')} />
        {step === 'search' && (
          <div className={styles.search}>
            <Field
              label="Search"
              placeholder="Type a product name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className={styles.results}>
              {loadingSearch && <p className={styles.muted}>Searching…</p>}
              {!loadingSearch && query && results.length === 0 && (
                <div className={styles.empty}>
                  <p className={styles.muted}>No products match "{query}".</p>
                  <Button variant="secondary" block onClick={() => setProductSheetOpen(true)}>
                    + Create new product
                  </Button>
                </div>
              )}
              {results.map((p) => (
                <button key={p.productId} className={styles.result} onClick={() => pick(p)}>
                  <div className={styles.resultName}>{p.name}</div>
                  <div className={styles.resultMacros}>
                    {Math.round(p.caloriesPer100Grams)} kcal · P {p.proteinPer100Grams}
                    {' '}· C {p.carbsPer100Grams} · F {p.fatPer100Grams} (per 100g)
                  </div>
                </button>
              ))}
              {!query && results.length === 0 && (
                <p className={styles.muted}>Start typing to search products.</p>
              )}
            </div>
          </div>
        )}
        {step === 'grams' && selected && (
          <div className={styles.gramsStep}>
            <button className={styles.back} onClick={() => setStep('search')} aria-label="Back">‹ Search</button>
            <p className={styles.selected}>
              {selected.name} — {Math.round(selected.caloriesPer100Grams)} kcal / 100g
            </p>
            <Field
              label="Grams"
              type="number"
              min="1"
              step="any"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              autoFocus
            />
            {grams && parseFloat(grams) > 0 && (
              <p className={styles.preview}>
                ≈ {Math.round(selected.caloriesPer100Grams * parseFloat(grams) / 100)} kcal
              </p>
            )}
          </div>
        )}
      </Sheet>
      <AddProductSheet
        isOpen={productSheetOpen}
        onClose={() => setProductSheetOpen(false)}
        defaultName={query}
        onCreated={(created) => {
          setProductSheetOpen(false);
          // The /new/product response shape currently differs from /products/search;
          // re-search so the picked item has the same shape as a search result.
          setQuery(created.name);
        }}
      />
    </>
  );
}
