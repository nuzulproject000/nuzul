import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { Providers } from "@/app/providers";
import { routes } from "@/app/router";

/** Renders the real route tree at a URL, with fresh providers. */
export function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  return { router, ...render(<Providers><RouterProvider router={router} /></Providers>) };
}
