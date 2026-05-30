import React from 'react';
import Sheet from './Sheet';
import Button from './Button';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={
        <div className={styles.actions}>
          <Button variant="secondary" block onClick={onCancel}>{cancelLabel}</Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            block
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {message && <p className={styles.message}>{message}</p>}
    </Sheet>
  );
}
