import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import ToastProvider from '@/components/ToastProvider';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'VaultAI — AI-Powered Password Manager',
  description: 'Secure your digital life with zero-knowledge encryption and AI-powered security analysis. VaultAI keeps your passwords safe with AES-256-GCM encryption.',
  keywords: ['password manager', 'AI security', 'encryption', 'zero-knowledge', 'vault'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ToastProvider>
            <Navbar />
            <main>{children}</main>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
