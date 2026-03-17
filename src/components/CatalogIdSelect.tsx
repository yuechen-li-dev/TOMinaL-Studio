export type CatalogSelectOption = {
  id: string;
  label: string;
  secondary?: string;
};

type CatalogIdSelectProps = {
  className?: string;
  currentValue?: string;
  idLabel: string;
  onChange: (nextId: string | undefined) => void;
  options: CatalogSelectOption[];
  placeholder?: string;
};

export function catalogSelectValueToId(value: string): string | undefined {
  return value || undefined;
}

export function CatalogIdSelect({
  className,
  currentValue,
  idLabel,
  onChange,
  options,
  placeholder = 'Unbound'
}: CatalogIdSelectProps) {
  const hasCurrentValue = Boolean(currentValue);
  const currentExists = hasCurrentValue ? options.some((option) => option.id === currentValue) : true;

  return (
    <select
      className={className}
      onChange={(event) => onChange(catalogSelectValueToId(event.target.value))}
      onPointerDown={(event) => event.stopPropagation()}
      value={currentValue ?? ''}
    >
      <option value="">{placeholder}</option>
      {!currentExists && currentValue && <option value={currentValue}>UNKNOWN ({currentValue}) (missing)</option>}
      {options.length === 0 ? (
        <option disabled value="__NO_ITEMS__">
          No {idLabel}
        </option>
      ) : (
        options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
            {option.secondary ? ` — ${option.secondary}` : ''}
          </option>
        ))
      )}
    </select>
  );
}
