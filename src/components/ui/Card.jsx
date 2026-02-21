export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={[
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
        'dark:border-gray-700 dark:bg-gray-800',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={['mb-4', className].join(' ')}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h2 className={['text-lg font-semibold text-gray-900 dark:text-gray-100', className].join(' ')}>
      {children}
    </h2>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
