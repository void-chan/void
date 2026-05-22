/** src/components/ui/Alert.jsx */
import { cn } from '../../utils/cn';

const types = { error: 'alert-error', success: 'alert-success', warn: 'alert-warn', info: 'alert-info' };

export function Alert({ children, type = 'info', className }) {
  if (!children) return null;
  return (
    <div className={cn('alert', types[type], className)} role="alert">
      {children}
    </div>
  );
}
