// frontend/src/components/PasswordField.jsx
import React, { useId, useState } from 'react';
import fieldStyles from './Field.module.css';
import styles from './PasswordField.module.css';

export default function PasswordField({ label, error, id: providedId, ...rest }) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const [visible, setVisible] = useState(false);

  const inputClass = [fieldStyles.input, styles.input, error ? fieldStyles.inputError : '']
    .filter(Boolean).join(' ');

  return (
    <div className={fieldStyles.field}>
      {label && <label className={fieldStyles.label} htmlFor={id}>{label}</label>}
      <div className={styles.wrap}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={inputClass}
          aria-invalid={!!error}
          {...rest}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && <p className={fieldStyles.error} role="alert">{error}</p>}
    </div>
  );
}
