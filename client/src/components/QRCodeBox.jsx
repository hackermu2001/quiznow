import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRCodeBox({ value, size = 140 }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#1e0a3c', light: '#ffffff' },
    })
      .then(setSrc)
      .catch(() => {});
  }, [value, size]);

  if (!src) return null;
  return (
    <img
      src={src}
      alt="QR Code Join Game"
      width={size}
      height={size}
      className="rounded-lg bg-white p-1.5 shadow-md"
    />
  );
}
