export const notifyChange = (code: string) => {
  // báo cho tab hiện tại
  window.dispatchEvent(new CustomEvent('chat:update', { detail: code }));

  // báo cho các tab khác (multi tab)
  if ('BroadcastChannel' in window) {
    const bc = new BroadcastChannel('chat-sync');
    bc.postMessage(code);
    bc.close();
  }
};

export const listenChange = (code: string, callback: () => void) => {
  const handler = (e: any) => {
    if (e.detail === code) callback();
  };

  const bc = new BroadcastChannel('chat-sync');

  const bcHandler = (e: MessageEvent) => {
    if (e.data === code) callback();
  };

  window.addEventListener('chat:update', handler);
  bc.addEventListener('message', bcHandler);

  return () => {
    window.removeEventListener('chat:update', handler);
    bc.removeEventListener('message', bcHandler);
    bc.close();
  };
};