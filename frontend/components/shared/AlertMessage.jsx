'use client';
import { RocketIcon } from "@radix-ui/react-icons";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

/**
 * Reusable alert component
 * @param {string} type - Alert type: 'success', 'info', 'warning', 'error'
 * @param {string} title - Alert title
 * @param {string|React.ReactNode} message - Alert message
 * @param {boolean} breakAll - If true, allows long texts to break (for hashes)
 */
const AlertMessage = ({ type = 'info', title = 'Information', message, breakAll = false }) => {
  // Define background colors based on type
  const bgColors = {
    success: 'bg-lime-200',
    info: 'bg-blue-100',
    warning: 'bg-amber-200',
    error: 'bg-red-400'
  };

  const bgColor = bgColors[type] || bgColors.info;

  return (
    <Alert className={`mb-2 ${bgColor} text-xs sm:text-sm`}>
      <RocketIcon className="h-3 w-3 sm:h-4 sm:w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className={breakAll ? 'break-all' : ''}>
        {message}
      </AlertDescription>
    </Alert>
  );
};

export default AlertMessage; 