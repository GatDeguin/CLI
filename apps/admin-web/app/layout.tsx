import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <body style={{ margin: 0, fontFamily: 'Inter, Arial, sans-serif', background: '#f3f5fb' }}>{children}</body>
    </html>
  );
}
