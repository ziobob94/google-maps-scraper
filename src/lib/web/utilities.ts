/**
 * This module provides a set of utility functions for common tasks such as flattening and unflattening objects, 
 * converting ObjectId to string, performing DNS NS lookups,
 * encrypting and decrypting timestamps using AES encryption, and delaying execution. 
 * These functions facilitate various operations such as data manipulation, 
 * network operations, and encryption in JavaScript applications.
 * @module
 */

import { ObjectId } from 'mongodb';

/**
 * Flattens an object into a one-level object with dotted keys.
 * 
 * @param {Object} obj - The object to flatten.
 * @param {Array<string>} [skipKeys=[]] - Keys to skip during flattening.
 * @returns {Object} - The flattened object.
 */
export function flattenObject(obj: any, skipKeys: string[] = []): any {
    const result: { [key: string]: any } = {};

    function recurse(current: any, path: string[] = []) {
        for (const key in current) {
            const newPath = path.concat([key]);
            if (current[key] && typeof current[key] === 'object' && !skipKeys.includes(key)) {
                if (current[key] instanceof ObjectId) {
                    result[newPath.join('.')] = convertObjectIdToString(current[key]);
                } else {
                    recurse(current[key], newPath);
                }
            } else {
                result[newPath.join('.')] = convertObjectIdToString(current[key]);
            }
        }
    }

    recurse(obj);
    return result;
}

/**
 * Converts a flattened object back to its original unflattened form.
 * 
 * @param {Object} obj - The flattened object to unflatten.
 * @returns {Object} - The unflattened object.
 */
export function unflattenObject(obj: { [key: string]: any }): any {
    const result: any = {};

    for (const key in obj) {
        const keys = key.split('.');
        let current = result;

        for (let i = 0; i < keys.length; i++) {
            const currentKey = keys[i];
            const isLastKey = i === keys.length - 1;

            if (isLastKey) {
                if (isNaN(Number(currentKey))) {
                    current[currentKey] = obj[key];
                } else {
                    current.push(obj[key]);
                }
            } else {
                current[currentKey] = current[currentKey] || (isNaN(Number(keys[i + 1])) ? {} : []);
                current = current[currentKey];
            }
        }
    }

    return result;
}

/**
 * Converts an ObjectId to its string representation.
 * 
 * @param {ObjectId} value - The ObjectId to convert.
 * @returns {string} - The string representation of the ObjectId.
 */
function convertObjectIdToString(value: any): string | any {
    if (value instanceof ObjectId) {
        return value.toString();
    }
    return value;
}

/**
 * Delays execution for a specified amount of time.
 * 
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>} - A promise that resolves after the specified delay.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}




/**
 * Parses the database error and returns a formatted response.
 *
 * @param {Error} error - the database error to be parsed.
 * @returns {object|string} the formatted response or error message.
 */
export function dbErrorParser(error: any): object | string {
    try {
        if (error.code === 11000) {
            return {
                status: 400,
                message: 'Resource already exists'
            };
        } else if (error.name === 'CastError') {
            return {
                status: 404,
                message: 'Resource not found'
            };
        } else if (error.name === 'ValidationError') {
            const messages: string[] = [];
            if (error.errors) {
                for (const key in error.errors) {
                    const e = error.errors[key];
                    messages.push(e.message);
                }
                return messages.join(', ');
            }
        }
        return error;
    } catch (e) {
        console.error(e);
        return error;
    }
}

/**

/**
 * Converts a base64 string to a Blob object.
 *
 * @param {string} base64String - The base64 string to convert.
 * @param {string} [type] - The MIME type of the Blob.
 * @returns {Promise<Blob>} - A promise that resolves to a Blob object.
 */
export async function base64ToBlob(base64String: string, type?: string): Promise<Blob> {
    const binaryString = atob(base64String);

    // Convert binary string to array buffer
    const arrayBuffer = new ArrayBuffer(binaryString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }

    // Create Blob from array buffer
    const blob = new Blob([arrayBuffer], { type: type || 'application/octet-stream' });

    return blob;
}
