/**
 * src/utils/cn.js
 *
 * Tiny class name utility — avoids pulling in clsx/classnames package.
 * Filters falsy values and joins with a space.
 *
 * Usage: cn('base-class', condition && 'conditional-class', 'another')
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
