import * as React from 'react';
import type { ToastProps } from '@/components/ui/toast';

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 4000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
};

let count = 0;
function genId() { return String(++count); }

const listeners: Array<(state: ToasterToast[]) => void> = [];
let memoryState: ToasterToast[] = [];

function dispatch(toasts: ToasterToast[]) {
  memoryState = toasts;
  listeners.forEach((l) => l(toasts));
}

function addToast(props: Omit<ToasterToast, 'id'>) {
  const id = genId();
  const toast = { ...props, id };
  dispatch([toast, ...memoryState].slice(0, TOAST_LIMIT));
  setTimeout(() => dispatch(memoryState.filter((t) => t.id !== id)), TOAST_REMOVE_DELAY);
  return id;
}

export function useToast() {
  const [toasts, setToasts] = React.useState(memoryState);
  React.useEffect(() => {
    listeners.push(setToasts);
    return () => { listeners.splice(listeners.indexOf(setToasts), 1); };
  }, []);
  return {
    toasts,
    toast: (props: Omit<ToasterToast, 'id'>) => addToast(props),
    dismiss: (id?: string) => dispatch(id ? memoryState.filter((t) => t.id !== id) : []),
  };
}

export const toast = (props: Omit<ToasterToast, 'id'>) => addToast(props);
