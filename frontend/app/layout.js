import localFont from "next/font/local";
import "./globals.css";
import RainbowKitAndWagmiProvider from "@/utils/RainbowKitAndWagmiProvider";
import { Toaster } from 'sonner';
import Layout from "@/components/shared/Layout";

export const metadata = {
  title: "Adrenaline",
  description: "A la découverte de l'extrême!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RainbowKitAndWagmiProvider>
          <Layout>
            {children}
          </Layout>
        </RainbowKitAndWagmiProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
