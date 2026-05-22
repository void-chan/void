/** src/components/ui/Button.jsx */
import { cn } from '../../utils/cn';

const variants = { primary: 'btn-primary', danger: 'btn-danger', ghost: 'btn-ghost' };
const sizes    = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

export function Button({ children, variant='primary', size='md', loading=false, className, ...props }) {
  return (
    <button
      className={cn('btn', variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="spinner" style={{width:'0.8em',height:'0.8em'}} />}
      {children}
    </button>
  );
}
