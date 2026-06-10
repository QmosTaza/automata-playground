import { parseRegex } from "./utils";
import { ValidationResult, AutomatonId } from "@/types";


export function validateRegexInput(regexStr: string, id: AutomatonId = "temp-id"): ValidationResult {
    const cleanStr = regexStr.replace(/\s+/g, "");

    if (!cleanStr) {
        return {
            valid: false,
            errors: [{
                automataId: id,
                type: "REGEX_SYNTAX_ERROR",
                message: "Regular expression cannot be empty"
            }]
        };
    }

    try {
        parseRegex(cleanStr);
        
        return { valid: true, errors: [] };
    } catch (error: any) {
        const rawMessage = error?.message || "Invalid syntax configuration";
        
        const positionMatch = rawMessage.match(/at position (\d+)/i);
        const position = positionMatch ? parseInt(positionMatch[1], 10) : undefined;

        return {
            valid: false,
            errors: [{
                automataId: id,
                type: "REGEX_SYNTAX_ERROR",
                message: rawMessage,
                ...(position !== undefined ? { position } : {})
            }]
        };
    }
}