import axios from 'axios';
import { ExternalBookCandidate } from '../types';
import { IsbnUtils } from '../utils/isbn.utils';

export class GoogleBooksProvider {
  constructor(private apiKey?: string) {}

  async lookup(isbn: string): Promise<ExternalBookCandidate | null> {
    const cleanIsbn = IsbnUtils.clean(isbn);
    const keyParam = this.apiKey ? `&key=${this.apiKey}` : '';
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}${keyParam}`;

    try {
      const response = await axios.get(url, { timeout: 5000 });
      const item = response.data?.items?.[0]?.volumeInfo;
      if (!item) return null;

      let isbn10: string | null = null;
      let isbn13: string | null = null;
      if (Array.isArray(item.industryIdentifiers)) {
        for (const id of item.industryIdentifiers) {
          if (id.type === 'ISBN_10') isbn10 = id.identifier;
          if (id.type === 'ISBN_13') isbn13 = id.identifier;
        }
      }

      const publishedYear = item.publishedDate ? parseInt(item.publishedDate.slice(0, 4), 10) : null;

      return {
        provider: 'GOOGLE_BOOKS',
        title: item.title || '',
        subtitle: item.subtitle || null,
        authors: Array.isArray(item.authors) ? item.authors : ['Unknown'],
        publisher: item.publisher || null,
        publicationYear: isNaN(publishedYear as number) ? null : publishedYear,
        isbn10,
        isbn13,
        coverImageUrl: item.imageLinks?.thumbnail || item.imageLinks?.smallThumbnail || null,
        description: item.description || null,
        rawJson: item,
      };
    } catch (err) {
      console.warn('Google Books lookup failed for ISBN:', isbn, err instanceof Error ? err.message : err);
      return null;
    }
  }
}

export class OpenLibraryProvider {
  async lookup(isbn: string): Promise<ExternalBookCandidate | null> {
    const cleanIsbn = IsbnUtils.clean(isbn);
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`;

    try {
      const response = await axios.get(url, { timeout: 5000 });
      const item = response.data?.[`ISBN:${cleanIsbn}`];
      if (!item) return null;

      const publishedYear = item.publish_date ? parseInt(item.publish_date.match(/\d{4}/)?.[0] || '', 10) : null;

      const authors = Array.isArray(item.authors)
        ? item.authors.map((a: any) => a.name).filter(Boolean)
        : ['Unknown'];

      const publisher = Array.isArray(item.publishers)
        ? item.publishers.map((p: any) => p.name).join(', ')
        : null;

      return {
        provider: 'OPEN_LIBRARY',
        title: item.title || '',
        subtitle: item.subtitle || null,
        authors,
        publisher,
        publicationYear: isNaN(publishedYear as number) ? null : publishedYear,
        isbn10: item.identifiers?.isbn_10?.[0] || null,
        isbn13: item.identifiers?.isbn_13?.[0] || null,
        coverImageUrl: item.cover?.medium || item.cover?.small || null,
        description: typeof item.description === 'string' ? item.description : item.description?.value || null,
        rawJson: item,
      };
    } catch (err) {
      console.warn('Open Library lookup failed for ISBN:', isbn, err instanceof Error ? err.message : err);
      return null;
    }
  }
}

