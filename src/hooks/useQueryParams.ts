import { useLocation } from "react-router-dom";

export function useQueryParams(): URLSearchParams {
  const location = useLocation();
  return new URLSearchParams(location.search);
}
