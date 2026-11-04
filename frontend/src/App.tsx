import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ActorProvider } from './context/ActorContext';
import { ToastProvider } from './context/ToastContext';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: true, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ActorProvider>
          <RouterProvider router={router} />
        </ActorProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
