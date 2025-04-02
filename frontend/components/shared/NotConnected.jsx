import { AlertCircle } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
 
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

const NotConnected = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-3xl font-bold mb-6">Plateforme de saut en parachute</h1>
      <p className="text-xl mb-8">Connectez votre portefeuille pour accéder à l&apos;application</p>
      <ConnectButton />
    </div>
  );
}

export default NotConnected