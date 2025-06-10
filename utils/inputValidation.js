// Input validation utility functions

/**
 * Prevents special characters and formats input based on specified rules
 * @param {string} text - The input text to sanitize
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowSpaces - Whether to allow spaces (default: true)
 * @param {boolean} options.allowNumbers - Whether to allow numbers (default: true)
 * @param {boolean} options.allowLetters - Whether to allow letters (default: true)
 * @returns {string} - The sanitized text
 */
export const preventSpecialCharacters = (text, options = {}) => {
  const {
    allowSpaces = true,
    allowNumbers = true,
    allowLetters = true,
  } = options;

  let pattern = '';
  
  if (allowLetters) pattern += 'a-zA-Z';
  if (allowNumbers) pattern += '0-9';
  if (allowSpaces) pattern += '\\s';

  const regex = new RegExp(`[^${pattern}]`, 'g');
  return text.replace(regex, '');
};

/**
 * Formats category name input, preventing numbers and special characters
 * @param {string} text - The input text to sanitize
 * @returns {string} - The sanitized text
 */
export const formatCategoryName = (text) => {
  return preventSpecialCharacters(text, {
    allowSpaces: true,
    allowNumbers: false,
    allowLetters: true
  });
};

/**
 * Validates if the category name contains only letters and spaces
 * @param {string} text - The text to validate
 * @returns {boolean} - Whether the text is valid
 */
export const validateCategoryName = (text) => {
  return /^[a-zA-Z\s]*$/.test(text);
};

/**
 * Validates if the text contains only allowed characters
 * @param {string} text - The text to validate
 * @param {Object} options - Same options as preventSpecialCharacters
 * @returns {boolean} - Whether the text is valid
 */
export const validateCharacters = (text, options = {}) => {
  const {
    allowSpaces = true,
    allowNumbers = true,
    allowLetters = true,
  } = options;

  let pattern = '^[';
  
  if (allowLetters) pattern += 'a-zA-Z';
  if (allowNumbers) pattern += '0-9';
  if (allowSpaces) pattern += '\\s';
  
  pattern += ']*$';

  const regex = new RegExp(pattern);
  return regex.test(text);
};

/**
 * Formats numeric input, removing non-numeric characters
 * @param {string} text - The input text
 * @returns {string} - Text with only numbers
 */
export const formatNumericInput = (text) => {
  return text.replace(/[^0-9]/g, '');
};

/**
 * Formats price input, preventing zero as first digit and non-numeric characters
 * @param {string} text - The input text
 * @returns {string} - Formatted price text
 */
export const formatPriceInput = (text) => {
  // Remove any non-numeric characters
  const numericOnly = text.replace(/[^0-9]/g, '');
  
  // If the first character is 0 and there are more digits, remove the leading zero
  if (numericOnly.length > 1 && numericOnly[0] === '0') {
    return numericOnly.slice(1);
  }
  
  // If it's just a single 0, return empty string
  if (numericOnly === '0') {
    return '';
  }
  
  return numericOnly;
};

/**
 * Validates if a price value is valid (greater than zero)
 * @param {string} price - The price value to validate
 * @returns {boolean} - Whether the price is valid
 */
export const validatePrice = (price) => {
  const numericPrice = parseInt(price);
  return !isNaN(numericPrice) && numericPrice > 0;
};

/**
 * Validates if a mobile number starts with valid digits (6-9)
 * @param {string} number - The mobile number to validate
 * @returns {boolean} - Whether the number starts with a valid digit
 */
export const validateMobileStart = (number) => {
  if (!number || number.length === 0) return true;
  const firstDigit = parseInt(number[0]);
  return firstDigit >= 6 && firstDigit <= 9;
}; 