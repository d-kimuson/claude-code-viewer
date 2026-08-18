type ServiceWorkerUpdateActions = {
  claimClients: () => void;
  skipWaiting: () => Promise<void>;
};

export const enableImmediateServiceWorkerUpdate = ({
  claimClients,
  skipWaiting,
}: ServiceWorkerUpdateActions): Promise<void> => {
  claimClients();
  return skipWaiting();
};
