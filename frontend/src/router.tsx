import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { WorkOrderDetailPage } from './features/work-orders/WorkOrderDetailPage';
import { WorkOrderListPage } from './features/work-orders/WorkOrderListPage';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Navigate to="/work-orders" replace /> },
      { path: '/work-orders', element: <WorkOrderListPage /> },
      { path: '/work-orders/:id', element: <WorkOrderDetailPage /> },
      { path: '*', element: <Navigate to="/work-orders" replace /> },
    ],
  },
]);
