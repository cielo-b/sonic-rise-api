/** Postgres returns DECIMAL columns as strings; expose them as numbers. */
export const decimalTransformer = {
  to: (v: number | null | undefined) => v,
  from: (v: string | null) => (v === null ? null : parseFloat(v)),
};
