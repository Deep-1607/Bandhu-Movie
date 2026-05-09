import React, { useEffect, useState } from 'react';
import useStore from '../../store/useStore';
import './Toast.css';

export default function Toast() {
  const toast = useStore((s) => s.toast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) { setVisible(true); }
    else { setVisible(false); }
  }, [toast]);

  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.type} ${visible ? 'toast--in' : ''}`}>
      <span className="toast__icon">
        {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'}
      </span>
      {toast.message}
    </div>
  );
}
