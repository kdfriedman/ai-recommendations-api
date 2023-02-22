export const getData = async <T>(url: RequestInfo, options: RequestInit): Promise<T> => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.log("res.status: ", res.status);
      throw new Error("Failed to fetch data");
    }
    return res.json();
  } catch (err) {
    throw err;
  }
};
