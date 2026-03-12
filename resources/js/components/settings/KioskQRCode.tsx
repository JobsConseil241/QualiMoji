import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface Props {
  url: string;
  size?: number;
}

export default function KioskQRCode({ url, size = 140 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }
  }, [url, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded"
      role="img"
      aria-label={`QR Code pour ${url}`}
    />
  );
}
