import React, { useState } from 'react';
import Sheet from '../../components/Sheet';
import Field from '../../components/Field';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { createProduct } from '../../api/meals';
import styles from './AddProductSheet.module.css';

const PRODUCT_TYPES = [
  { value: 'MEAT', label: 'Meat' },
  { value: 'FRUITS', label: 'Fruits' },
  { value: 'VEGETABLES', label: 'Vegetables' },
  { value: 'DAIRY', label: 'Dairy' },
  { value: 'LEGUMES', label: 'Legumes' },
  { value: 'CEREALS', label: 'Cereals' },
  { value: 'TUBERS', label: 'Tubers' },
];

const EMPTY = {
  name: '',
  productType: '',
  caloriesPer100Grams: '',
  proteinPer100Grams: '',
  fatPer100Grams: '',
  carbsPer100Grams: '',
  barcode: '',
};

function validate(form) {
  const e = {};
  if (!form.name.trim()) e.name = 'Required';
  if (!form.productType) e.productType = 'Pick a type';
  for (const k of ['caloriesPer100Grams', 'proteinPer100Grams', 'fatPer100Grams', 'carbsPer100Grams']) {
    const n = parseFloat(form[k]);
    if (Number.isNaN(n) || n < 0) e[k] = 'Invalid';
  }
  return e;
}

// A number turned into a form-input string, or '' if null/undefined.
function numOrEmpty(v) {
  return v == null ? '' : String(v);
}

/**
 * Create-product form. `defaultName` seeds the name; `prefill` (optional) seeds
 * any fields from a scanned/looked-up product (name, macros, barcode, type).
 * Returns the created product to the caller via onCreated.
 */
export default function AddProductSheet({ isOpen, onClose, onCreated, defaultName = '', prefill = null }) {
  const [form, setForm] = useState({ ...EMPTY, name: defaultName });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  // Reset on open. When a prefill is provided (from a scan/lookup), seed the
  // form from it; otherwise start empty with just the search query as the name.
  // The barcode is carried in state (not shown) so it still saves with the
  // product, keeping the next scan of it instant.
  React.useEffect(() => {
    if (isOpen) {
      if (prefill) {
        setForm({
          ...EMPTY,
          name: prefill.name ?? defaultName,
          productType: prefill.productType ?? '',
          caloriesPer100Grams: numOrEmpty(prefill.caloriesPer100Grams),
          proteinPer100Grams: numOrEmpty(prefill.proteinPer100Grams),
          fatPer100Grams: numOrEmpty(prefill.fatPer100Grams),
          carbsPer100Grams: numOrEmpty(prefill.carbsPer100Grams),
          barcode: prefill.barcode ?? '',
        });
        setNotice(prefill.notice || '');
      } else {
        setForm({ ...EMPTY, name: defaultName });
        setNotice('');
      }
      setErrors({});
      setServerError('');
    }
  }, [isOpen, defaultName, prefill]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setSubmitting(true);
    try {
      const created = await createProduct({
        name: form.name.trim(),
        productType: form.productType,
        caloriesPer100Grams: parseFloat(form.caloriesPer100Grams),
        proteinPer100Grams: parseFloat(form.proteinPer100Grams),
        fatPer100Grams: parseFloat(form.fatPer100Grams),
        carbsPer100Grams: parseFloat(form.carbsPer100Grams),
        barcode: form.barcode.trim() || null,
      });
      onCreated(created);
    } catch (err) {
      setServerError(err.message || 'Could not save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="New product"
      footer={
        <Button block onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save product'}
        </Button>
      }
    >
      <ErrorBanner message={serverError} onDismiss={() => setServerError('')} />
      {notice && <p className={styles.notice}>{notice}</p>}
      <div className={styles.fields}>
        <Field label="Name" value={form.name} onChange={update('name')} error={errors.name} />
        <Field label="Type" as="select" value={form.productType}
               onChange={update('productType')} error={errors.productType}>
          <option value="">Select type</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Field>
        <Field label="Calories per 100g" type="number" min="0" step="any"
               value={form.caloriesPer100Grams} onChange={update('caloriesPer100Grams')}
               error={errors.caloriesPer100Grams} />
        <Field label="Protein per 100g" type="number" min="0" step="any"
               value={form.proteinPer100Grams} onChange={update('proteinPer100Grams')}
               error={errors.proteinPer100Grams} />
        <Field label="Carbs per 100g" type="number" min="0" step="any"
               value={form.carbsPer100Grams} onChange={update('carbsPer100Grams')}
               error={errors.carbsPer100Grams} />
        <Field label="Fat per 100g" type="number" min="0" step="any"
               value={form.fatPer100Grams} onChange={update('fatPer100Grams')}
               error={errors.fatPer100Grams} />
      </div>
    </Sheet>
  );
}
