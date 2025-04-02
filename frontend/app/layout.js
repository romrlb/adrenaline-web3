import "./globals.css";
import RainbowKitAndWagmiProvider from "@/utils/RainbowKitAndWagmiProvider";
import SWRProvider from '@/lib/swr-config';
import { Toaster } from 'sonner';
import Layout from "@/components/shared/Layout";

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <RainbowKitAndWagmiProvider>
          <SWRProvider>
            <Layout>
              {children}
            </Layout>
          </SWRProvider>
        </RainbowKitAndWagmiProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
