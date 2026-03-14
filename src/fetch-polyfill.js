
const nativeFetch = typeof window !== 'undefined' ? window.fetch : undefined;
const nativeRequest = typeof window !== 'undefined' ? window.Request : undefined;
const nativeResponse = typeof window !== 'undefined' ? window.Response : undefined;
const nativeHeaders = typeof window !== 'undefined' ? window.Headers : undefined;
const nativeFormData = typeof window !== 'undefined' ? window.FormData : undefined;

export default nativeFetch;
export { 
  nativeFetch as fetch,
  nativeRequest as Request,
  nativeResponse as Response,
  nativeHeaders as Headers,
  nativeFormData as FormData
};
