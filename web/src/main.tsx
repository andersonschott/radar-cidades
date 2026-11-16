import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { CityLayout, PageSkeleton, RootLayout, RouteError } from './layout'
import City from './pages/City'
import Councilors from './pages/Councilors'
import Home from './pages/Home'
import Methodology from './pages/Methodology'
import Neighborhoods from './pages/Neighborhoods'
import Profile from './pages/Profile'

export const routes = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Suspense fallback={<PageSkeleton />}><Home /></Suspense> },
      {
        path: '/:city',
        element: <CityLayout />,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <City /> },
          { path: 'vereadores', element: <Councilors /> },
          { path: 'vereadores/:slug', element: <Profile /> },
          { path: 'bairros', element: <Neighborhoods /> },
          { path: 'metodologia', element: <Methodology /> },
        ],
      },
    ],
  },
]

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={createBrowserRouter(routes)} />
  </StrictMode>,
)
