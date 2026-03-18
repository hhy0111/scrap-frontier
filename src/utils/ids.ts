let idCounter = 0;

export const nextId = (prefix: string): string => {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
};
