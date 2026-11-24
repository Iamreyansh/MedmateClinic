import { useRoutes } from "react-router-dom";
import { routes } from "@/app/routes";

export function AppRoutes() {
  return useRoutes(routes);
}
