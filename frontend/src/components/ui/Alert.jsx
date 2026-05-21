/** src/components/ui/Alert.jsx */
import { cn } from '../../utils/cn';

const types = {
  error:   'alert-error',
  success: 'alert-success',
  info:    'alert-info',
};

const icons = {
  error:   '⚠',
  success: '✓',
  info:    'ℹ',
};

export function Alert({ children, type = 'info', className }) {
  if (!children) return null;
  return (
    <div className={cn('alert', types[type], className)} role="alert">
      <span aria-hidden>{icons[type]}</span>
      <span>{children}</span>
    </div>
  );
}
