const roleStyles = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  caregiver: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  family: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  patient: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

const roleLabels = {
  admin: 'Admin',
  caregiver: 'Caregiver',
  family: 'Family',
  patient: 'Patient',
};

export function Badge({ role, label, className = '' }) {
  const style = roleStyles[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  const text = label || roleLabels[role] || role;

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        style,
        className,
      ].join(' ')}
    >
      {text}
    </span>
  );
}
