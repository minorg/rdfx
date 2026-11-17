type NonArray<T> = T extends readonly unknown[] ? never : T;

export function appendRecordValue<ValueT>(
  record: Record<string, ValueT | ValueT[]>,
  key: string,
  value: NonArray<ValueT>,
): void {
  const existingValues = record[key];
  if (existingValues === undefined) {
    record[key] = value;
  } else if (Array.isArray(existingValues)) {
    existingValues.push(value);
  } else {
    record[key] = [existingValues, value];
  }
}
