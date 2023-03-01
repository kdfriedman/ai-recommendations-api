export const findByValue = (object: { [key: string]: any }, val: string) => {
  if (Object.values(object).includes(val)) return object;
  for (const objectKey of Object.values(object)) {
    const found = findByValue(objectKey, val);
    if (found) return objectKey;
  }
};
