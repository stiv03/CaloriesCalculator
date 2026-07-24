// frontend/src/features/today/AddMealSheet.jsx
import React, { useCallback, useEffect, useState } from 'react';
import Sheet from '../../components/Sheet';
import Field from '../../components/Field';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { addMeal, searchProducts, lookupBarcode } from '../../api/meals';
import { getTemplates, createTemplate, deleteTemplate, addItemToTemplate, updateTemplateItem, removeTemplateItem } from '../../api/templates';
import { getUserId } from '../../auth/storage';
import AddProductSheet from './AddProductSheet';
import BarcodeScanner from './BarcodeScanner';
import styles from './AddMealSheet.module.css';

/** Barcode glyph — vertical bars of varying width. Uses currentColor. */
const BarcodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="3" y="5" width="1.5" height="14" />
    <rect x="6" y="5" width="1" height="14" />
    <rect x="9" y="5" width="2" height="14" />
    <rect x="13" y="5" width="1" height="14" />
    <rect x="16" y="5" width="2.5" height="14" />
    <rect x="20" y="5" width="1" height="14" />
  </svg>
);

export default function AddMealSheet({ isOpen, onClose, onAdded, onDone, mealType }) {
  const userId = getUserId();
  const [tab, setTab] = useState('search'); // 'search' | 'templates'
  const [step, setStep] = useState('search'); // search step: 'search' | 'grams' | 'saveName'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState('');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [productPrefill, setProductPrefill] = useState(null); // seeds AddProductSheet after a scan/lookup
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [saveName, setSaveName] = useState('');
  const [addedItems, setAddedItems] = useState([]);
  const [expandedTemplateId, setExpandedTemplateId] = useState(null);
  const [editingGrams, setEditingGrams] = useState({}); // { itemId: gramsString }
  const [addingToTemplateId, setAddingToTemplateId] = useState(null); // templateId when adding product

  const loadTemplates = useCallback(async () => {
    try { setTemplates(await getTemplates(userId)); }
    catch (_e) { /* silent */ }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      setTab('search'); setStep('search'); setQuery(''); setResults([]);
      setSelected(null); setGrams(''); setServerError('');
      setSubmitting(false); setAddedItems([]); setSaveName('');
      loadTemplates();
    }
  }, [isOpen, loadTemplates]);

  // Debounced search
  useEffect(() => {
    if (tab !== 'search' || step !== 'search') return undefined;
    if (!query || query.trim().length < 1) { setResults([]); return undefined; }
    const handle = setTimeout(async () => {
      setLoadingSearch(true);
      try { setResults(await searchProducts(query.trim())); }
      catch (_e) { /* silent */ }
      finally { setLoadingSearch(false); }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, tab, step, searchNonce]);

  const pick = (product) => { setSelected(product); setStep('grams'); setGrams(''); };

  // Barcode lookup from the search row. Local hit -> jump straight to the grams
  // step for that product. External hit -> open the create sheet prefilled with
  // the OFF data. Miss -> open the create sheet with just the barcode.
  const runBarcode = async (code) => {
    const trimmed = String(code || '').trim();
    if (!trimmed) return;
    setLooking(true);
    setServerError('');
    try {
      const result = await lookupBarcode(trimmed);
      if (result && result.source === 'local' && result.product) {
        pick(result.product); // already in our DB with an id — log it directly
      } else if (result && result.product) {
        setProductPrefill({
          ...result.product,
          notice: 'Product found. Set the type and check the macros are correct before saving.',
        });
        setProductSheetOpen(true);
      } else {
        setProductPrefill({
          barcode: trimmed,
          notice: `Product not found for barcode ${trimmed}. Enter its details below to add it — it'll be saved for next time.`,
        });
        setProductSheetOpen(true);
      }
    } catch (err) {
      setServerError(err.message || 'Barcode lookup failed');
    } finally {
      setLooking(false);
    }
  };

  const handleScanDetected = (code) => {
    setScanning(false);
    runBarcode(code);
  };

  const handleAdd = async () => {
    const n = parseFloat(grams);
    if (Number.isNaN(n) || n <= 0) return;
    setSubmitting(true);
    setServerError('');
    try {
      await addMeal(userId, selected.productId, Math.round(n), mealType);
      setAddedItems((prev) => [...prev, {
        productId: selected.productId,
        productName: selected.name,
        grams: Math.round(n),
        caloriesPer100Grams: selected.caloriesPer100Grams,
      }]);
      await onAdded();
      // Stay open so user can add more or save a template
      setStep('search'); setQuery(''); setResults([]); setSelected(null); setGrams('');
    } catch (err) {
      setServerError(err.message || 'Could not add meal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!saveName.trim() || addedItems.length === 0) return;
    try {
      await createTemplate(userId, saveName.trim(), addedItems);
      setSaveName('');
      setStep('search');
      await loadTemplates();
    } catch (err) {
      setServerError(err.message || 'Could not save template');
    }
  };

  const handleApplyTemplate = async (template) => {
    setSubmitting(true);
    setServerError('');
    try {
      await Promise.all(
        template.items.map((item) => addMeal(userId, item.productId, item.grams, mealType))
      );
      onAdded();
    } catch (err) {
      setServerError(err.message || 'Could not apply template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (e, templateId) => {
    e.stopPropagation();
    try {
      await deleteTemplate(userId, templateId);
      await loadTemplates();
    } catch (_e) { /* silent */ }
  };

  const handleUpdateItemGrams = async (templateId, itemId) => {
    const g = parseInt(editingGrams[itemId], 10);
    if (!g || g <= 0) return;
    try {
      const updated = await updateTemplateItem(userId, templateId, itemId, g);
      setTemplates((prev) => prev.map((t) => t.id === templateId ? updated : t));
      setEditingGrams((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
    } catch (err) { setServerError(err.message || 'Failed to update'); }
  };

  const handleRemoveItem = async (templateId, itemId) => {
    try {
      const updated = await removeTemplateItem(userId, templateId, itemId);
      setTemplates((prev) => prev.map((t) => t.id === templateId ? updated : t));
    } catch (err) { setServerError(err.message || 'Failed to remove'); }
  };

  const handleAddProductToTemplate = async (product) => {
    // Reuse pick() flow but after grams go to addToTemplate instead
    setSelected(product);
    setStep('gramsForTemplate');
    setGrams('');
  };

  const handleConfirmAddToTemplate = async () => {
    const n = parseFloat(grams);
    if (Number.isNaN(n) || n <= 0) return;
    try {
      const item = {
        productId: selected.productId,
        productName: selected.name,
        grams: Math.round(n),
        caloriesPer100Grams: selected.caloriesPer100Grams,
      };
      const updated = await addItemToTemplate(userId, addingToTemplateId, item);
      setTemplates((prev) => prev.map((t) => t.id === addingToTemplateId ? updated : t));
      setStep('search');
      setTab('templates');
      setAddingToTemplateId(null);
      setSelected(null);
      setGrams('');
      setQuery('');
      setResults([]);
    } catch (err) { setServerError(err.message || 'Failed to add'); }
  };

  const niceMeal = mealType ? mealType[0] + mealType.slice(1).toLowerCase() : null;
  const title = step === 'grams'
    ? `How much ${selected?.name}?`
    : step === 'gramsForTemplate'
    ? `How much ${selected?.name}?`
    : step === 'saveName'
    ? 'Save as template'
    : (niceMeal ? `Add to ${niceMeal}` : 'Add a meal');

  const footer = step === 'grams'
    ? (
      <div className={styles.gramsFooter}>
        <Button block disabled={!grams || submitting} onClick={handleAdd}>
          {submitting ? 'Adding…' : 'Add meal'}
        </Button>
      </div>
    )
    : step === 'gramsForTemplate'
    ? (
      <Button block disabled={!grams} onClick={handleConfirmAddToTemplate}>Add to template</Button>
    )
    : step === 'saveName'
    ? (
      <Button block disabled={!saveName.trim()} onClick={handleSaveTemplate}>Save template</Button>
    )
    : step === 'search'
    ? (
      <div className={styles.gramsFooter}>
        {addedItems.length > 0 && (
          <button type="button" className={styles.saveTemplateBtn} onClick={() => setStep('saveName')}>
            Save {addedItems.length} item{addedItems.length > 1 ? 's' : ''} as template
          </button>
        )}
        <Button block variant="secondary" onClick={onDone}>Done</Button>
      </div>
    )
    : null;

  return (
    <>
      <Sheet isOpen={isOpen && !productSheetOpen} onClose={onClose} title={title} footer={footer}>
        <ErrorBanner message={serverError} onDismiss={() => setServerError('')} />

        {/* Tab bar — only on the search step */}
        {step === 'search' && (
          <div className={styles.tabs}>
            <button
              className={[styles.tabBtn, tab === 'search' ? styles.tabBtnActive : ''].join(' ')}
              onClick={() => setTab('search')}
            >Search</button>
            <button
              className={[styles.tabBtn, tab === 'templates' ? styles.tabBtnActive : ''].join(' ')}
              onClick={() => setTab('templates')}
            >Templates {templates.length > 0 && `(${templates.length})`}</button>
          </div>
        )}

        {/* Search tab — also used when adding a product to an existing template */}
        {step === 'search' && tab === 'search' && (
          <div className={styles.search}>
            <div className={styles.searchRow}>
              <div className={styles.searchField}>
                <Field
                  label="Search"
                  placeholder="Type a product name…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <button
                type="button"
                className={styles.scanBtn}
                onClick={() => setScanning(true)}
                disabled={looking}
                aria-label="Scan barcode"
                title="Scan barcode"
              >
                {looking ? '…' : (<><BarcodeIcon /><span>Scan</span></>)}
              </button>
            </div>
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
                <button key={p.productId} className={styles.result} onClick={() =>
                  addingToTemplateId ? handleAddProductToTemplate(p) : pick(p)
                }>
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

        {/* Templates tab */}
        {step === 'search' && tab === 'templates' && (
          <div className={styles.templateList}>
            {templates.length === 0 && (
              <p className={styles.muted}>No templates yet. Add some meals and save them as a template.</p>
            )}
            {templates.map((t) => (
              <div key={t.id} className={styles.templateCard}>
                <div className={styles.templateHeader}>
                  <button className={styles.templateToggle} onClick={() =>
                    setExpandedTemplateId((id) => id === t.id ? null : t.id)
                  }>
                    <span className={styles.templateName}>{t.name}</span>
                    <span className={styles.templateMeta}>
                      {t.items.length} item{t.items.length !== 1 ? 's' : ''} · {
                        Math.round(t.items.reduce((s, i) => s + (i.caloriesPer100Grams || 0) * i.grams / 100, 0))
                      } kcal
                    </span>
                  </button>
                  <div className={styles.templateActions}>
                    <Button disabled={submitting} onClick={() => handleApplyTemplate(t)}>
                      {submitting ? '…' : 'Add all'}
                    </Button>
                    <button className={styles.deleteBtn} onClick={(e) => handleDeleteTemplate(e, t.id)} aria-label="Delete">✕</button>
                  </div>
                </div>

                {expandedTemplateId === t.id && (
                  <div className={styles.templateEdit}>
                    {t.items.map((item) => (
                      <div key={item.id} className={styles.editItemRow}>
                        <span className={styles.editItemName}>{item.productName}</span>
                        <input
                          type="number"
                          className={styles.editItemGrams}
                          value={editingGrams[item.id] ?? item.grams}
                          onChange={(e) => setEditingGrams((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          min="1"
                        />
                        <span className={styles.editItemUnit}>g</span>
                        {editingGrams[item.id] !== undefined && String(editingGrams[item.id]) !== String(item.grams) && (
                          <button className={styles.saveItemBtn} onClick={() => handleUpdateItemGrams(t.id, item.id)}>✓</button>
                        )}
                        <button className={styles.deleteBtn} onClick={() => handleRemoveItem(t.id, item.id)}>✕</button>
                      </div>
                    ))}
                    <button className={styles.addItemBtn} onClick={() => {
                      setAddingToTemplateId(t.id);
                      setTab('search');
                      setStep('search');
                      setQuery('');
                      setResults([]);
                    }}>
                      + Add product
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Grams for template step */}
        {step === 'gramsForTemplate' && selected && (
          <div className={styles.gramsStep}>
            <button className={styles.back} onClick={() => { setStep('search'); setTab('search'); }}>‹ Search</button>
            <p className={styles.selected}>
              {selected.name} — {Math.round(selected.caloriesPer100Grams)} kcal / 100g
            </p>
            <Field label="Grams" type="number" min="1" step="any"
              value={grams} onChange={(e) => setGrams(e.target.value)} autoFocus />
            {grams && parseFloat(grams) > 0 && (
              <p className={styles.preview}>
                ≈ {Math.round(selected.caloriesPer100Grams * parseFloat(grams) / 100)} kcal
              </p>
            )}
          </div>
        )}

        {/* Grams step */}
        {step === 'grams' && selected && (
          <div className={styles.gramsStep}>
            <button className={styles.back} onClick={() => setStep('search')}>‹ Search</button>
            <p className={styles.selected}>
              {selected.name} — {Math.round(selected.caloriesPer100Grams)} kcal / 100g
            </p>
            <Field
              label="Grams"
              type="number" min="1" step="any"
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

        {/* Save template name step */}
        {step === 'saveName' && (
          <div className={styles.gramsStep}>
            <button className={styles.back} onClick={() => setStep('grams')}>‹ Back</button>
            <p className={styles.muted}>
              Saving {addedItems.length} item{addedItems.length !== 1 ? 's' : ''} as a template.
            </p>
            <Field
              label="Template name"
              placeholder="e.g. My usual breakfast"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </Sheet>

      <AddProductSheet
        isOpen={productSheetOpen}
        onClose={() => { setProductSheetOpen(false); setProductPrefill(null); }}
        defaultName={query}
        prefill={productPrefill}
        onCreated={(created) => {
          setProductSheetOpen(false);
          setProductPrefill(null);
          setQuery(created.name);
          setSearchNonce((n) => n + 1);
        }}
      />
      {scanning && (
        <BarcodeScanner
          onDetected={handleScanDetected}
          onClose={() => setScanning(false)}
        />
      )}
    </>
  );
}
