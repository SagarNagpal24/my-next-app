import "./globals.css";
import Providers from "./providers";
import ClientShell from "./ClientShell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-shell">
        <Providers >
          <ClientShell>{children}</ClientShell>
        </Providers>
      </body>
    </html>
  );
}
