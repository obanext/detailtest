export function mapWiseToOba({ title, availability, summary }) {
  return {
    title: title.title,
    author: title.author?.description,
    imprint: title.imprint,
    isbn: title.isbn,
    summary: title.contents,
    image: title.imageUrls?.medium,
    availability: availability?.[0]?.availability || [],
    related: summary?.items || []
  };
}
