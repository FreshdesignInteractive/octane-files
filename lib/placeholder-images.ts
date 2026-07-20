// Shown wherever a car has no real photos uploaded yet — barn-find photos
// with a "coming soon" sign, standing in for the old generic icon. They
// behave like real photos (clickable gallery, lightbox, full-bleed cover),
// just not photos of that specific car. Single source so CarCard, the
// detail page, and CarGallery never drift on which files these are.
export const PLACEHOLDER_HERO_IMAGE = '/coming-soon-1.webp'
export const PLACEHOLDER_GALLERY_IMAGES = ['/coming-soon-2.webp', '/coming-soon-3.webp', '/coming-soon-4.webp']
export const PLACEHOLDER_ALL_IMAGES = [PLACEHOLDER_HERO_IMAGE, ...PLACEHOLDER_GALLERY_IMAGES]
