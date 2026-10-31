export class IsbnUtils {
  static clean(isbn: string): string {
    return isbn
      .replace(/ISBN(?:-1[03])?:?/gi, '')
      .replace(/[-\s]/g, '')
      .toUpperCase()
      .trim();
  }

  static isValidIsbn10(isbn: string): boolean {
    const clean = this.clean(isbn);
    if (!/^[0-9]{9}[0-9X]$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(clean[i], 10) * (10 - i);
    }
    const checkChar = clean[9];
    sum += checkChar === 'X' ? 10 : parseInt(checkChar, 10);

    return sum % 11 === 0;
  }

  static isValidIsbn13(isbn: string): boolean {
    const clean = this.clean(isbn);
    if (!/^[0-9]{13}$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(clean[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(clean[12], 10);
  }

  static validateAndFormat(rawInput: string): {
    isValid: boolean;
    type: 'ISBN10' | 'ISBN13' | 'INVALID';
    normalized: string;
  } {
    const clean = this.clean(rawInput);
    if (this.isValidIsbn13(clean)) {
      return { isValid: true, type: 'ISBN13', normalized: clean };
    }
    if (this.isValidIsbn10(clean)) {
      return { isValid: true, type: 'ISBN10', normalized: clean };
    }
    return { isValid: false, type: 'INVALID', normalized: clean };
  }

  static extractIsbnsFromText(text: string): string[] {
    const results: string[] = [];
    const regex = /(?:ISBN(?:-1[03])?:?\s*)?(?:97[89][-\s]?)?[0-9]{1,5}[-\s]?[0-9]+[-\s]?[0-9]+[-\s]?[0-9X]/gi;
    const matches = text.match(regex);
    if (!matches) return results;

    for (const match of matches) {
      const res = this.validateAndFormat(match);
      if (res.isValid && !results.includes(res.normalized)) {
        results.push(res.normalized);
      }
    }
    return results;
  }
}

