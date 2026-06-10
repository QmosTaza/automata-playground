import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === "undefined") {
            return initialValue;
        }

        try {
            const item = window.localStorage.getItem(key);
            // Parse stored json or if none return initialValue
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error("Error reading localStorage key:", key, error);
            return initialValue;
        }
    });

    // Wrapped version of useState's setter function that persists the new value to localStorage.
    const setValue = (
        value: T | ((val: T) => T)
    ) => {
        setStoredValue(prev => {
            const valueToStore =
                value instanceof Function
                    ? value(prev)
                    : value;

            localStorage.setItem(
                key,
                JSON.stringify(valueToStore)
            );

            return valueToStore;
        });
    };

    return [storedValue, setValue];
}