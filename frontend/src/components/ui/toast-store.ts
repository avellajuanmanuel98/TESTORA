import { create } from "zustand";

export interface Toast {
  id: number;
  tone: "success" | "danger" | "info";
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => ({ toasts: [...state.toasts, { ...toast, id: nextId++ }] })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().push({ tone: "success", message }),
  error: (message: string) => useToastStore.getState().push({ tone: "danger", message }),
  info: (message: string) => useToastStore.getState().push({ tone: "info", message }),
};
