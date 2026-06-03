export function slugify(text: string) {
  return (
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-') // Replace spaces and underscores with -
      // eslint-disable-next-line no-useless-escape
      .replace(/[^\w\-]+/g, '') // Remove special characters
      .replace(/\\-\\-+/g, '-')
  ) // Replace multiple - with single -
}
