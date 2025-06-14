/**
 * This configuration is the single source of truth for file types supported by the application.
 * It is based on the MIME types defined in the Supabase Storage bucket policies
 * in the migration file: supabase/migrations/20250608052026_chat_app_schema.sql.
 * Keeping this in sync with the backend storage rules is crucial for consistent file handling.
 */

interface FileType {
  mimeType: string;
  extension: string;
}

// ================================================================================
// Image Types
// All models with `image` capability can accept these.
// Limited to formats actually supported by AI models: PNG, JPEG, GIF, WebP
// ================================================================================
export const SUPPORTED_IMAGE_TYPES: FileType[] = [
  { mimeType: "image/jpeg", extension: ".jpg" },
  { mimeType: "image/png", extension: ".png" },
  { mimeType: "image/gif", extension: ".gif" },
  { mimeType: "image/webp", extension: ".webp" },
];
export const IMAGE_MIME_TYPES = SUPPORTED_IMAGE_TYPES.map((t) => t.mimeType);
export const IMAGE_EXTENSIONS = SUPPORTED_IMAGE_TYPES.map((t) => t.extension);

// ================================================================================
// PDF Document Types
// Only models with `pdf` capability can accept these.
// ================================================================================
export const SUPPORTED_PDF_TYPES: FileType[] = [{ mimeType: "application/pdf", extension: ".pdf" }];
export const PDF_MIME_TYPES = SUPPORTED_PDF_TYPES.map((t) => t.mimeType);
export const PDF_EXTENSIONS = SUPPORTED_PDF_TYPES.map((t) => t.extension);

// ================================================================================
// Text & Document Types
// Assumed to be supported by all models, as they can process text content.
// ================================================================================
export const SUPPORTED_TEXT_TYPES: FileType[] = [
  { mimeType: "text/plain", extension: ".txt" },
  { mimeType: "text/markdown", extension: ".md" },
  { mimeType: "text/csv", extension: ".csv" },
  {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: ".docx",
  },
  { mimeType: "application/json", extension: ".json" },
  { mimeType: "text/html", extension: ".html" },
  { mimeType: "application/sql", extension: ".sql" },
];
export const TEXT_MIME_TYPES = SUPPORTED_TEXT_TYPES.map((t) => t.mimeType);
export const TEXT_EXTENSIONS = SUPPORTED_TEXT_TYPES.map((t) => t.extension);

/**
 * A comprehensive list of all file extensions supported for upload,
 * derived from the specific types above.
 */
export const ALL_SUPPORTED_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...PDF_EXTENSIONS,
  ...TEXT_EXTENSIONS,
];
