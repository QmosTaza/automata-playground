import { FiniteAutomaton } from "@/types";
import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    // sinc reading
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === "undefined") return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error("[useLocalStorage] Reading error:", error);
            return initialValue;
        }
    });

    // unified setter
    const setValue = useCallback((value: T | ((val: T) => T)) => {
        setStoredValue(prev => {
            const valueToStore = value instanceof Function ? value(prev) : value;
            try {
                if (typeof window !== "undefined") {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }
            } catch (error) {
                console.error("[useLocalStorage] Writing error:", error);
            }
            return valueToStore;
        });
    }, [key]);

    return [storedValue, setValue];
}