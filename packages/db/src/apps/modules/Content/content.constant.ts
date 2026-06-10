const ContentType = {
  ABOUTUS: 'about_us',
  PRIVACYPOLICY: 'privacy_policy',
  TERMSANDCONDITION: 'terms_and_condition',
} as const

export const contentTypeValues = Object.values(ContentType)

export type TContentType = (typeof ContentType)[keyof typeof ContentType]
