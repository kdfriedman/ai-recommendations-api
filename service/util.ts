type QueryParamsConfig = {
  [key: string]: string;
};

export const parseQueryParams = (config: QueryParamsConfig = {}): string => {
  if (Object.keys(config).length === 0) return "";
  const queryParams = new URLSearchParams(config);
  return `?${queryParams.toString()}`;
};
